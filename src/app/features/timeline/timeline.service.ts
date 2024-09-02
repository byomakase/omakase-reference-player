/*
 * Copyright 2024 ByOmakase, LLC (https://byomakase.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {TelemetryOgChartLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/telemetry-og-chart-lane';
import {TelemetryBarChartLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/telemetry-bar-chart-lane';
import {TelemetryLineChartLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/telemetry-line-chart-lane';
import {TelemetryMarkerLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/telemetry-marker-lane';
import {TextTrackGroupingLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/text-track-grouping-lane';
import {Injectable} from '@angular/core';
import {LineChartLaneStyle, MarkerLane, MarkerLaneStyle, MarkerVttCue, MomentMarker, OmakasePlayerApi, OmakaseVttFile, PeriodMarker, SubtitlesVttTrack, ThumbnailLane, TimelineLaneApi} from '@byomakase/omakase-player';
import {Analysis, ChartAnalysis, VisualReference} from '../../model/domain.model';
import {Constants} from '../../shared/constants/constants';
import {ColorUtil} from '../../util/color-util';
import {CustomSubtitlesLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/custom-subtitles-lane';
import {Store} from '@ngxs/store';
import {TelemetryActions} from '../main/telemetry/telemetry.actions';
import {VideoControllerApi} from '@byomakase/omakase-player/dist/video/video-controller-api';
import {TelemetryState} from '../main/telemetry/telemetry.state';
import {Observable} from 'rxjs';

import SelectLane = TelemetryActions.SelectLane;

export type TelemetryLane = TelemetryLineChartLane | TelemetryBarChartLane | TelemetryOgChartLane | TelemetryMarkerLane;

const telemetryHideResolution = 1300;

@Injectable({
  providedIn: 'root'
})
export class TimelineService {

  private _omakasePlayerApi?: OmakasePlayerApi;

  private _coloredLaneColorByIndex: Map<number, string> = new Map<number, string>();
  private _markerLaneStyleByName: Map<string, Partial<MarkerLaneStyle>> = new Map<string, Partial<MarkerLaneStyle>>();
  private _lineChartLaneStyleByName: Map<string, Partial<LineChartLaneStyle>> = new Map<string, Partial<LineChartLaneStyle>>();

  constructor(
    protected store: Store
  ) {
  }

  createLaneByVisualReference(visualReference: VisualReference): TimelineLaneApi {
    switch (visualReference.type) {
      case 'thumbnails':
        return this.createThumbnailLane(visualReference);
      default:
        throw new Error(`Visual reference type not recognized: ${visualReference.type}`)
    }
  }

  createAnalysisLanes(analysis: Analysis[]): TimelineLaneApi[] {
    let lanes: TimelineLaneApi[] = [];
    analysis.filter(p => p.type === 'events' || p.type === 'event').forEach(analysis => {
      let lane = this.createMarkerLane(analysis);
      lanes.push(lane);
    })

    analysis.filter(p => p.type === 'chart').forEach(analysis => {
      let lane: TelemetryLineChartLane | TelemetryOgChartLane | TelemetryBarChartLane;

      if (analysis.visualization === 'line') {
        lane = this.createLineChartLane(analysis);
        lanes.push(lane);
      }

      if (analysis.visualization === 'bar') {
        lane = this.createBarChartLane(analysis);
        lanes.push(lane);
      }

      if (analysis.visualization === 'led') {
        lane = this.createLedChartLane(analysis);
        lanes.push(lane);
      }

      this.addTelemetryButton(lane!);
    })

    return lanes;
  }

  createMarkerLane(analysis: Analysis): MarkerLane {
    let style = this.resolveMarkerLaneStyle(analysis);

    let lane = new TelemetryMarkerLane({
      vttUrl: analysis.url,
      description: analysis.name,
      markerCreateFn: (cue: MarkerVttCue, index: number) => {
        if (analysis.visualization === 'marker') {
          return new PeriodMarker({
            timeObservation: {
              start: cue.startTime,
              end: cue.endTime
            },
            text: cue.text,
            editable: false,
            style: {
              ...style.markerStyle,
              ...Constants.PERIOD_MARKER_STYLE,
            }
          })
        } else if (analysis.visualization === 'point') {
          return new MomentMarker({
            timeObservation: {
              time: cue.startTime
            },
            text: cue.text,
            editable: false,
            style: {
              ...style.markerStyle,
              ...Constants.MOMENT_MARKER_STYLE,
            }
          })
        } else {
          throw new Error(`Unrecognized analysis visualization: ${analysis.visualization}`)
        }
      },
      markerProcessFn: (marker, index) => {
        marker.onClick$.subscribe({
          next: (event) => {
            console.debug(`Clicked on marker ${marker.id} : ${marker.text}`)
          }
        })
      },
      style: {
        ...style,
      }
    })

    this.addTelemetryButton(lane);

    return lane;
  }

  createLineChartLane(analysis: Analysis): TelemetryLineChartLane {
    let chartAnalysis = analysis as ChartAnalysis;

    let lane = new TelemetryLineChartLane({
      vttUrl: analysis.url,
      description: analysis.name,
      yMax: chartAnalysis.y_max,
      yMin: chartAnalysis.y_min,
      style: {
        ...this.resolveLineChartLaneStyle(analysis)
      }
    });

    return lane;
  }

  createLedChartLane(analysis: Analysis): TelemetryOgChartLane {
    return this.createBarOrLedChart('led', analysis) as TelemetryOgChartLane;
  }

  createBarChartLane(analysis: Analysis): TelemetryBarChartLane {
    return this.createBarOrLedChart('bar', analysis) as TelemetryBarChartLane;
  }

  createSubtitlesLane(subtitlesVttTrack: SubtitlesVttTrack): CustomSubtitlesLane {
    let lane = new CustomSubtitlesLane({
      subtitlesVttTrack: subtitlesVttTrack,
      description: ``,
      style: {
        ...Constants.SUBTITLES_LANE_STYLE
      }
    }, this._omakasePlayerApi!.subtitles);

    return lane;
  }

  getVideoController(): VideoControllerApi {
    return (this._omakasePlayerApi as any)._videoController;
  }

  getFirstTelemetryLane(): TimelineLaneApi | undefined {
    return this._omakasePlayerApi?.timeline?.getTimelineLanes().find(lane => this.isTelemetryLane(lane));
  }

  getTimelineLaneById(id: string): TimelineLaneApi | undefined {
    return this._omakasePlayerApi?.timeline?.getTimelineLane(id);
  }

  getTextGroupingLanes(): TextTrackGroupingLane[] | undefined {
    return this._omakasePlayerApi?.timeline?.getTimelineLanes()?.filter(lane => lane instanceof TextTrackGroupingLane) as TextTrackGroupingLane[];
  }

  getSubtitleLaneForGroupingLane(lane: TextTrackGroupingLane): CustomSubtitlesLane | undefined {
    return this._omakasePlayerApi?.timeline?.getTimelineLanes()?.find(l => l instanceof CustomSubtitlesLane && l.subtitlesVttTrack.label === lane.subtitlesVttTrack?.label) as CustomSubtitlesLane;
  }

  isTelemetryLane(lane: TimelineLaneApi): boolean {
    if (!(lane instanceof TelemetryLineChartLane) && !(lane instanceof TelemetryBarChartLane) && !(lane instanceof TelemetryOgChartLane) && !(lane instanceof TelemetryMarkerLane)) {
      return false;
    }
    return !!lane.vttFile?.extensionVersion;
  }

  isTelemetryComponentShown(): boolean {
    return window.innerWidth > telemetryHideResolution;
  }

  private createThumbnailLane(visualReference: VisualReference): ThumbnailLane {
    let timelineLane = new ThumbnailLane({
      style: {
        ...Constants.THUMBNAIL_LANE_STYLE,
      },
      vttUrl: visualReference.url
    })

    // timelineLane.onClick$.subscribe((event) => {
    //   if (event.thumbnail.cue) {
    //     this._omakasePlayerApi?.video.seekToTime(event.thumbnail.cue.startTime).subscribe(() => {
    //     })
    //   }
    // })

    return timelineLane;
  }

  private processColoredLaneResolveColor(): string {
    let index = this._coloredLaneColorByIndex.size;
    let color = this.resolveHeuristicColor(index);
    this._coloredLaneColorByIndex.set(index, color);
    return color;
  }

  private resolveLineChartLaneStyle(analysis: Analysis): Partial<LineChartLaneStyle> {
    let color = this.processColoredLaneResolveColor();

    let style: Partial<LineChartLaneStyle> = {
      ...Constants.LINE_CHART_LANE_STYLE,
      fill: color,
      pointFill: ColorUtil.changeShade(color, 30),
    };

    if (this._lineChartLaneStyleByName.has(analysis.name)) {
      style = this._lineChartLaneStyleByName.get(analysis.name)!;
    } else {
      this._lineChartLaneStyleByName.set(analysis.name, style);
    }

    return style;
  }

  private resolveMarkerLaneStyle(analysis: Analysis): Partial<MarkerLaneStyle> {
    let color = this.processColoredLaneResolveColor();

    let style: Partial<MarkerLaneStyle> = {
      ...Constants.MARKER_LANE_STYLE,
      markerStyle: {
        color: color
      }
    };

    if (this._markerLaneStyleByName.has(analysis.name)) {
      style = this._markerLaneStyleByName.get(analysis.name)!;
    } else {
      this._markerLaneStyleByName.set(analysis.name, style);
    }

    return style;
  }

  set omakasePlayerApi(value: OmakasePlayerApi) {
    this._omakasePlayerApi = value;
  }

  private resolveHeuristicColor(index: number): string {
    return Constants.VARIABLES.entitiesColors[index % Constants.VARIABLES.entitiesColors.length];
  }

  private createBarOrLedChart(type: 'bar' | 'led', analysis: Analysis): TelemetryBarChartLane | TelemetryOgChartLane {
    let chartAnalysis = analysis as ChartAnalysis;

    let valueMax: number | undefined;
    let valueMin: number | undefined;
    let valueTransformFn: ((value: number) => number) | undefined;

    if (chartAnalysis.y_min !== void 0 && chartAnalysis.y_max !== void 0) {
      if (chartAnalysis.y_min >= 0 && (chartAnalysis.y_max > chartAnalysis.y_min)) {
        valueMax = chartAnalysis.y_max;
        valueMin = chartAnalysis.y_min;
      } else if (chartAnalysis.y_min < 0 && chartAnalysis.y_max <= 0 && (chartAnalysis.y_min < chartAnalysis.y_max)) {
        valueMax = Math.abs(chartAnalysis.y_min) - Math.abs(chartAnalysis.y_max);
        valueMin = Math.abs(chartAnalysis.y_max);
        valueTransformFn =  (value: number) => {
          return valueMax! - Math.abs(value);
        }
      } else if (chartAnalysis.y_min > chartAnalysis.y_max) {
        throw new Error(`${type === 'bar' ? 'BarChartLane' : 'OgChartLane'} data with y_min: ${chartAnalysis.y_min} and y_max: ${chartAnalysis.y_max} not supported`)
      }
    }

    const style = type === 'bar' ? Constants.BAR_CHART_LANE_STYLE : Constants.OG_CHART_LANE_STYLE;
    const config: any = {
      vttUrl: analysis.url,
      description: analysis.name,
      valueMax: valueMax,
      valueMin: valueMin,
      valueTransformFn: valueTransformFn,
      valueInterpolationStrategy: 'max',
      style: {
        ...style
      }
    }

    let lane = type === 'bar' ? new TelemetryBarChartLane(config) : new TelemetryOgChartLane(config);
    return lane;
  }

  private addTelemetryButton<T>(lane: TelemetryLane) {
    const vttFileLoaded$: Observable<OmakaseVttFile<any>> = lane.onVttFileLoaded$;
    vttFileLoaded$.subscribe({
      next: () => {
        if (lane.telemetryButton) {
          return;
        }
        lane.addTelemetryButton(this.isTelemetryLane(lane));
        lane.telemetryButton!.onClick$.subscribe({
          next: () => {
            if (!this.isTelemetryLane(lane) || !this.isTelemetryComponentShown()) {
              return;
            }
            const selectedLaneId = this.store.selectSnapshot(TelemetryState.selectedLaneId);
            this.store.dispatch(new SelectLane(selectedLaneId === lane.id ? undefined : lane.id));
          }
        });
      }
    });
  }
}
