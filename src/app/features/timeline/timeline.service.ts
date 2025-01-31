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
import {BaseGroupingLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/base-grouping-lane';
import {VideoGroupingLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/video-grouping-lane';
import {AudioGroupingLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/audio-grouping-lane';
import {TextTrackGroupingLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/text-track-grouping-lane';
import {Injectable} from '@angular/core';
import {LineChartLaneStyle, MarkerLane, MarkerLaneStyle, MarkerVttCue, MomentMarker, OmakaseVttFile, PeriodMarker, SubtitlesVttTrack, ThumbnailLane, TimelineLaneApi} from '@byomakase/omakase-player';
import {Analysis, ChartAnalysis, TimelineLaneWithOptionalGroup, VisualReference} from '../../model/domain.model';
import {ColorUtil} from '../../util/color-util';
import {CustomSubtitlesLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/custom-subtitles-lane';
import {Store} from '@ngxs/store';
import {TelemetryActions} from '../main/telemetry/telemetry.actions';
import {ChartLegendActions} from '../main/chart-legend/chart-legend.actions';
import {TelemetryState} from '../main/telemetry/telemetry.state';
import {Observable, Subject, takeUntil} from 'rxjs';
import {OmpApiService} from '../../shared/components/omakase-player/omp-api.service';
import SelectLane = TelemetryActions.SelectLane;
import ShowLegend = ChartLegendActions.Show;
import HideLegend = ChartLegendActions.Hide;
import {AudioChannelLane} from '../../shared/components/omakase-player/omakase-player-timeline/grouping/audio-channel-lane';
import {Constants} from '../../shared/constants/constants';
import {LayoutService} from '../../core/layout/layout.service';
import {completeSub} from '../../util/rx-util';

export type TelemetryLane = TelemetryLineChartLane | TelemetryBarChartLane | TelemetryOgChartLane | TelemetryMarkerLane;

const telemetryHideResolution = 1300;

@Injectable({
  providedIn: 'root',
})
export class TimelineService {
  readonly onReady$: Subject<void> = new Subject();

  private _coloredLaneColorByIndex: Map<number, string> = new Map<number, string>();
  private _markerLaneStyleByName: Map<string, Partial<MarkerLaneStyle>> = new Map<string, Partial<MarkerLaneStyle>>();
  private _lineChartLaneStyleByName: Map<string, Partial<LineChartLaneStyle>> = new Map<string, Partial<LineChartLaneStyle>>();

  private _destroyed = new Subject<void>();

  constructor(
    protected store: Store,
    protected ompApiService: OmpApiService
  ) {}

  ngOnDestroy() {
    completeSub(this._destroyed);
  }

  createLaneByVisualReference(visualReference: VisualReference): TimelineLaneApi {
    switch (visualReference.type) {
      case 'thumbnails':
        return this.createThumbnailLane(visualReference);
      default:
        throw new Error(`Visual reference type not recognized: ${visualReference.type}`);
    }
  }

  createAnalysisLanes(analysis: Analysis[]): TimelineLaneWithOptionalGroup<TimelineLaneApi>[] {
    let lanes: TimelineLaneWithOptionalGroup<TimelineLaneApi>[] = [];

    analysis
      .filter((p) => p.type === 'events' || p.type === 'event')
      .forEach((analysis) => {
        let lane = this.createMarkerLane(analysis) as TimelineLaneWithOptionalGroup<TelemetryMarkerLane>;
        lane.group = analysis.group;
        lanes.push(lane);
      });

    analysis
      .filter((p) => p.type === 'chart')
      .forEach((analysis) => {
        let lane: TimelineLaneWithOptionalGroup<TelemetryLineChartLane | TelemetryBarChartLane | TelemetryOgChartLane>;

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

        lane!.group = analysis.group;
        this.addTelemetryButton(lane!);
      });

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
              end: cue.endTime,
            },
            text: cue.text,
            editable: false,
            style: {
              ...style.markerStyle,
              ...Constants.PERIOD_MARKER_STYLE,
              ...LayoutService.themeStyleConstants.PERIOD_MARKER_STYLE_COLORS,
            },
          });
        } else if (analysis.visualization === 'point') {
          return new MomentMarker({
            timeObservation: {
              time: cue.startTime,
            },
            text: cue.text,
            editable: false,
            style: {
              ...style.markerStyle,
              ...Constants.MOMENT_MARKER_STYLE,
              ...LayoutService.themeStyleConstants.MOMENT_MARKER_STYLE_COLORS,
            },
          });
        } else {
          throw new Error(`Unrecognized analysis visualization: ${analysis.visualization}`);
        }
      },
      markerProcessFn: (marker, index) => {
        marker.onClick$.subscribe({
          next: (event) => {
            console.debug(`Clicked on marker ${marker.id} : ${marker.text}`);
          },
        });
      },
      style: {
        ...style,
      },
    });

    this.addTelemetryButton(lane);

    return lane;
  }

  createLineChartLane(analysis: Analysis): TelemetryLineChartLane {
    let chartAnalysis = analysis as ChartAnalysis;
    let singleLineChartStyle = this.resolveLineChartLaneStyle(analysis);

    let lane = new TelemetryLineChartLane({
      vttUrl: analysis.url,
      description: analysis.name,
      yMax: chartAnalysis.y_max,
      yMin: chartAnalysis.y_min,
      style: {
        ...Constants.LINE_CHART_LANE_STYLE,
        ...LayoutService.themeStyleConstants.LINE_CHART_LANE_STYLE_COLORS,
      },
      lineStyleFn: (index, count) => {
        if (count > 1) {
          return {
            ...this.resolveMultiLineChartLaneStyle(analysis, index),
          };
        } else {
          return {
            ...singleLineChartStyle,
          };
        }
      },
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
    let lane = new CustomSubtitlesLane(
      {
        subtitlesVttTrack: subtitlesVttTrack,
        description: ``,
        style: {
          ...Constants.SUBTITLES_LANE_STYLE,
          ...LayoutService.themeStyleConstants.SUBTITLES_LANE_STYLE_COLORS,
        },
      },
      this.ompApiService.api!.subtitles
    );

    return lane;
  }

  getFirstTelemetryLane(): TimelineLaneApi | undefined {
    return this.ompApiService.api?.timeline?.getTimelineLanes().find((lane) => this.isTelemetryLane(lane));
  }

  getTimelineLaneById(id: string): TimelineLaneApi | undefined {
    return this.ompApiService.api?.timeline?.getTimelineLane(id);
  }

  getGroupingLanes(): BaseGroupingLane<any>[] | undefined {
    return this.ompApiService.api?.timeline
      ?.getTimelineLanes()
      ?.filter((lane) => lane instanceof VideoGroupingLane || lane instanceof AudioGroupingLane || lane instanceof TextTrackGroupingLane) as BaseGroupingLane<any>[];
  }

  getTextGroupingLanes(): TextTrackGroupingLane[] | undefined {
    return this.ompApiService.api?.timeline?.getTimelineLanes()?.filter((lane) => lane instanceof TextTrackGroupingLane) as TextTrackGroupingLane[];
  }

  getSubtitleLaneForGroupingLane(lane: TextTrackGroupingLane): CustomSubtitlesLane | undefined {
    return this.ompApiService.api?.timeline?.getTimelineLanes()?.find((l) => l instanceof CustomSubtitlesLane && l.subtitlesVttTrack.label === lane.subtitlesVttTrack?.label) as CustomSubtitlesLane;
  }

  getAudioGroupingLanes(): AudioGroupingLane[] | undefined {
    return this.ompApiService.api?.timeline?.getTimelineLanes()?.filter((lane) => lane instanceof AudioGroupingLane) as AudioGroupingLane[];
  }

  getAudioChannelLanes(): AudioChannelLane[] | undefined {
    return this.ompApiService.api?.timeline?.getTimelineLanes()?.filter((lane) => lane instanceof AudioChannelLane) as AudioChannelLane[];
  }

  getThumbnailLane(): ThumbnailLane | undefined {
    return this.ompApiService.api?.timeline?.getTimelineLanes()?.find((l) => l instanceof ThumbnailLane) as ThumbnailLane;
  }

  addTimelineLaneAtIndex(lane: TimelineLaneApi, index: number) {
    this.ompApiService.api!.timeline!.addTimelineLaneAtIndex(lane, index);
  }

  removeTimelineLane(id: string) {
    this.ompApiService.api!.timeline!.removeTimelineLane(id);
  }

  minimize(lane: TimelineLaneApi[]) {
    this.ompApiService.api!.timeline!.minimizeTimelineLanes(lane);
  }

  maximize(lane: TimelineLaneApi[]) {
    this.ompApiService.api!.timeline!.maximizeTimelineLanes(lane);
  }

  isTelemetryLane(lane: TimelineLaneApi): boolean {
    if (!this.isAnalyticsLane(lane)) {
      return false;
    }
    return !!(lane as TelemetryLane).vttFile?.extensionVersion;
  }

  isAnalyticsLane(lane: TimelineLaneApi): boolean {
    return lane instanceof TelemetryLineChartLane || lane instanceof TelemetryBarChartLane || lane instanceof TelemetryOgChartLane || lane instanceof TelemetryMarkerLane;
  }

  isTelemetryComponentShown(): boolean {
    return window.innerWidth > telemetryHideResolution;
  }

  private createThumbnailLane(visualReference: VisualReference): ThumbnailLane {
    let timelineLane = new ThumbnailLane({
      style: {
        ...Constants.THUMBNAIL_LANE_STYLE,
        ...LayoutService.themeStyleConstants.THUMBNAIL_LANE_STYLE_COLORS,
      },
      vttUrl: visualReference.url,
    });

    // timelineLane.onClick$.subscribe((event) => {
    //   if (event.thumbnail.cue) {
    //     this._omakasePlayerApi?.video.seekToTime(event.thumbnail.cue.startTime).subscribe(() => {
    //     })
    //   }
    // })

    this.ompApiService.api!.setThumbnailVttUrl(visualReference.url);

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
      ...LayoutService.themeStyleConstants.LINE_CHART_LANE_STYLE_COLORS,
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

  private resolveMultiLineChartLaneStyle(analysis: Analysis, index: number): Partial<LineChartLaneStyle> {
    const color = LayoutService.themeStyleConstants.COLORS.LINE_COLORS[index % LayoutService.themeStyleConstants.COLORS.LINE_COLORS.length];

    let style: Partial<LineChartLaneStyle> = {
      ...Constants.LINE_CHART_LANE_STYLE,
      ...LayoutService.themeStyleConstants.LINE_CHART_LANE_STYLE_COLORS,
      fill: color,
      pointFill: ColorUtil.changeShade(color, 30),
    };

    return style;
  }

  private resolveMarkerLaneStyle(analysis: Analysis): Partial<MarkerLaneStyle> {
    let color = this.processColoredLaneResolveColor();

    let style: Partial<MarkerLaneStyle> = {
      ...Constants.MARKER_LANE_STYLE,
      ...LayoutService.themeStyleConstants.MARKER_LANE_STYLE_COLORS,
      markerStyle: {
        color: color,
      },
    };

    if (this._markerLaneStyleByName.has(analysis.name)) {
      style = this._markerLaneStyleByName.get(analysis.name)!;
    } else {
      this._markerLaneStyleByName.set(analysis.name, style);
    }

    style = {
      ...style,
      ...Constants.MARKER_LANE_STYLE,
      ...LayoutService.themeStyleConstants.MARKER_LANE_STYLE_COLORS,
    };

    return style;
  }

  private resolveHeuristicColor(index: number): string {
    return LayoutService.themeStyleConstants.COLORS.ENTITIES_COLORS[index % LayoutService.themeStyleConstants.COLORS.ENTITIES_COLORS.length];
  }

  private createBarOrLedChart(type: 'bar' | 'led', analysis: Analysis): TelemetryBarChartLane | TelemetryOgChartLane {
    let chartAnalysis = analysis as ChartAnalysis;

    let valueMax: number | undefined;
    let valueMin: number | undefined;
    let valueTransformFn: ((value: number) => number) | undefined;

    if (chartAnalysis.y_min !== void 0 && chartAnalysis.y_max !== void 0) {
      if (chartAnalysis.y_min >= 0 && chartAnalysis.y_max > chartAnalysis.y_min) {
        valueMax = chartAnalysis.y_max;
        valueMin = chartAnalysis.y_min;
      } else if (chartAnalysis.y_min < 0 && chartAnalysis.y_max <= 0 && chartAnalysis.y_min < chartAnalysis.y_max) {
        valueMax = Math.abs(chartAnalysis.y_min) - Math.abs(chartAnalysis.y_max);
        valueMin = Math.abs(chartAnalysis.y_max);
        valueTransformFn = (value: number) => {
          return valueMax! - Math.abs(value);
        };
      } else if (chartAnalysis.y_min > chartAnalysis.y_max) {
        throw new Error(`${type === 'bar' ? 'BarChartLane' : 'OgChartLane'} data with y_min: ${chartAnalysis.y_min} and y_max: ${chartAnalysis.y_max} not supported`);
      }
    }

    const style =
      type === 'bar'
        ? {
            ...Constants.BAR_CHART_LANE_STYLE,
            ...LayoutService.themeStyleConstants.BAR_CHART_LANE_STYLE_COLORS,
          }
        : {
            ...Constants.OG_CHART_LANE_STYLE,
            ...LayoutService.themeStyleConstants.BAR_CHART_LANE_STYLE_COLORS,
          };
    const config: any = {
      vttUrl: analysis.url,
      description: analysis.name,
      valueMax: valueMax,
      valueMin: valueMin,
      valueTransformFn: valueTransformFn,
      valueInterpolationStrategy: 'max',
      style: {
        ...style,
      },
    };

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
          },
        });
        if (lane instanceof TelemetryLineChartLane) {
          lane.telemetryButton!.onMouseEnter$.subscribe({
            next: () => {
              const firstCue = lane.vttFile?.cues[0];
              const rows = firstCue?.extension?.rows;
              if (!rows) {
                return;
              }
              let colors: string[] | string = lane.style.fill;
              if (!Array.isArray(colors)) {
                colors = [colors];
              }
              const legendItems = rows.map((row, index) => ({
                label: row.measurement ?? '',
                color: (lane as any)._lineStyleFn ? (lane as any)._lineStyleFn(index, rows.length).fill : colors[index % colors.length],
              }));
              this.store.dispatch(new ShowLegend(legendItems));
            },
          });
          lane.telemetryButton!.onMouseLeave$.subscribe({
            next: () => {
              this.store.dispatch(new HideLegend());
            },
          });
        }
      },
    });
  }
}
