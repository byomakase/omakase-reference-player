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

import {Injectable} from '@angular/core';
import {Subject, Subscription, take, takeUntil} from 'rxjs';
import {TimelineService} from '../../timeline/timeline.service';
import {Marker, MarkerLane, MarkerLaneConfig, MarkerLaneStyle, MarkerListApi, MomentMarker, MomentObservation, PeriodMarker, PeriodObservation} from '@byomakase/omakase-player';
import {Store} from '@ngxs/store';
import {SegmentationState, SegmentationTrack} from '../segmentation/segmentation.state';
import {SegmentationActions} from '../segmentation/segmentation.actions';
import {CryptoUtil} from '../../../util/crypto-util';
import {MarkerApi} from '@byomakase/omakase-player/dist/api/marker-api';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import AddTrack = SegmentationActions.AddTrack;
import DeleteTrack = SegmentationActions.DeleteTrack;
import SetActiveTrack = SegmentationActions.SetActiveTrack;
import UpdateTrack = SegmentationActions.UpdateTrack;
import SetTracks = SegmentationActions.SetTracks;
import {LayoutService} from '../../../core/layout/layout.service';
import {Constants} from '../../../shared/constants/constants';
import {AnnotationService} from '../annotation/annotation.service';
import {AnnotationState} from '../annotation/annotation.state';

interface MarkerRecolorData {
  marker: MarkerApi;
  oldColor: string;
}

@Injectable({
  providedIn: 'root',
})
export class SegmentationService {
  private _isInitialized = false;
  private _segmentationCounter = 1;
  private _markerList?: MarkerListApi;
  private _selectedMarker?: MarkerApi;
  private _recoloredSplitMarker?: MarkerRecolorData;
  private _incompleteMarker?: PeriodMarker;
  private _initSubscription?: Subscription;
  private _markerLane?: MarkerLane;

  private _trackMarkersStorage: Map<SegmentationTrack, Marker[]> = new Map<SegmentationTrack, Marker[]>();

  onMarkerUpdate$ = new Subject<MarkerApi>();
  onAnnotationSelected$ = new Subject<boolean>();

  constructor(
    private timelineService: TimelineService,
    private store: Store,
    private ompApiService: OmpApiService,
    private layoutService: LayoutService,
    private annotationService: AnnotationService
  ) {
    this.annotationService.onMarkerSelected$.subscribe((marker) => {
      if (this.selectedMarker && this.markerLane !== this.annotationService.annotationLane) {
        this.markerLane!.toggleMarker(this.selectedMarker.id);
      }
      if (this.selectedMarker === marker) {
        const activeTrack = this.store.selectSnapshot(SegmentationState.activeTrack);
        if (activeTrack) {
          this.markerLane = this.timelineService.getTimelineLaneById(activeTrack.markerLaneId) as MarkerLane;
        } else {
          this.markerLane = undefined;
        }
        this.onAnnotationSelected$.next(false);
        this.selectedMarker = undefined;
      } else {
        this.markerLane = this.annotationService.annotationLane;
        this.onAnnotationSelected$.next(true);
        this.selectedMarker = marker;
        this.layoutService.activeTab = 'annotation';
      }
      this.annotationService.annotationLane!.toggleMarker(marker.id);
    });
    this.annotationService.onMarkerRemove$.subscribe((markerId) => {
      if (this.selectedMarker?.id === markerId) {
        this.selectedMarker = undefined;
      }
    });
  }

  initSegmentationMode() {
    if (this._isInitialized) {
      return;
    }
    if (this.ompApiService.api) {
      this.createSegmentationTrack();
      this._isInitialized = true;
    } else {
      this._initSubscription = this.timelineService.onReady$.pipe(take(1)).subscribe(() => {
        this.createSegmentationTrack();
        this._isInitialized = true;
        delete this._initSubscription;
      });
    }
  }

  resetSegmentationMode() {
    this._initSubscription?.unsubscribe();
    this.store.dispatch(new SetTracks([]));
    this._isInitialized = false;
    this._segmentationCounter = 1;
    delete this._markerList;
    delete this._selectedMarker;
    delete this._recoloredSplitMarker;
    delete this._incompleteMarker;
  }

  connectSegmentationMode(activeTrack: SegmentationTrack, destroyed$: Subject<void>) {
    let index = this.annotationService.annotationLane ? 2 : 1;
    this.trackMarkersStorage.forEach((markers, track) => {
      let style: Partial<MarkerLaneStyle> = {
        ...Constants.MARKER_LANE_STYLE,
        ...LayoutService.themeStyleConstants.MARKER_LANE_STYLE_COLORS,
        markerStyle: {
          color: track.color,
        },
      };

      const markerLane = this.createMarkerLaneForSegmentationTrack(
        {
          id: track.markerLaneId,
          description: track.name,
          style: {
            ...(style as MarkerLaneStyle),
          },
        },
        index
      );

      markers.forEach((marker) => {
        let m;
        if (marker instanceof PeriodMarker) {
          m = new PeriodMarker({
            id: marker.id,
            text: marker.text,
            timeObservation: marker.timeObservation,
            style: marker.style,
            editable: marker.editable,
          });
        } else {
          m = new MomentMarker({
            id: marker.id,
            text: marker.text,
            timeObservation: (marker as MomentMarker).timeObservation,
            style: {
              ...marker.style,
              lineOpacity: 0.2,
            },
            editable: marker.editable,
          });
          m.style.lineOpacity = 0;
        }
        this.addMarkerClickHandler(m, track);
        markerLane.addMarker(m);
      });
      index++;
    });

    this.markerLane = this.timelineService.getTimelineLaneById(activeTrack.markerLaneId) as MarkerLane;

    if (this.layoutService.activeTab === 'segmentation') {
      this.createMarkerList(activeTrack, destroyed$);
    }

    this.trackMarkersStorage.clear();
  }

  createMarkerList(activeTrack: SegmentationTrack, destroyed$: Subject<void>) {
    this.markerLane = this.timelineService.getTimelineLaneById(activeTrack.markerLaneId) as MarkerLane;
    this.selectedMarker && this.selectMarker(this.selectedMarker as Marker);
    this.ompApiService
      .api!.createMarkerList({
        markerListHTMLElementId: 'segmentation-marker-list',
        templateHTMLElementId: 'segmentation-marker-list-row',
        headerHTMLElementId: 'segmentation-marker-list-header',
        styleUrl: './assets/css/segmentation.css',
        source: this.markerLane,
        thumbnailVttFile: this.timelineService.getThumbnailLane()?.vttFile,
        nameEditable: true,
        timeEditable: true,
      })
      .subscribe({
        next: (markerList) => {
          this.markerList = markerList;
          this.markerList.onMarkerClick$.pipe(takeUntil(destroyed$)).subscribe(({marker}) => {
            this.unselectAnnotationMarker();
            this.toggleMarker(marker as Marker);
          });
          this.markerList.onMarkerSelected$.pipe(takeUntil(destroyed$)).subscribe(({marker}) => (this.selectedMarker = marker));
        },
      });
  }

  createSegmentationTrack(name?: string) {
    if (this._incompleteMarker) {
      return;
    }
    if (!this._isInitialized) {
      this._isInitialized = true;
    }
    const segmentationTrackCount = this.store.selectSnapshot(SegmentationState.tracks).length;
    if (!name) {
      name = `Segmentation ${this._segmentationCounter}`;
      this._segmentationCounter++;
    }
    let color = this.resolveHeuristicColor();
    let style: Partial<MarkerLaneStyle> = {
      ...Constants.MARKER_LANE_STYLE,
      ...LayoutService.themeStyleConstants.MARKER_LANE_STYLE_COLORS,
      markerStyle: {
        color,
      },
    };

    const markerLane = this.createMarkerLaneForSegmentationTrack(
      {
        description: name,
        style: {
          ...(style as MarkerLaneStyle),
        },
      },
      segmentationTrackCount + (this.annotationService.annotationLane ? 2 : 1)
    );

    const segmentationTrack: SegmentationTrack = {
      id: CryptoUtil.uuid(),
      name,
      color,
      markerLaneId: markerLane.id,
    };
    this.store.dispatch(new AddTrack(segmentationTrack));
    this.store.dispatch(new SetActiveTrack(segmentationTrack));
    // this.addPeriodMarker({ start: 0, end: 30 })
  }

  updateSegmentationTrackColor(track: SegmentationTrack, color: string) {
    const markerLane = this.timelineService.getTimelineLaneById(track.markerLaneId) as MarkerLane;
    for (const marker of markerLane.getMarkers()) {
      marker.style = {
        ...marker.style,
        color,
      };
    }
    this.store.dispatch(new UpdateTrack(track.id, {color}));
  }

  updateSegmentationTrackName(track: SegmentationTrack, name: string) {
    const markerLane = this.timelineService.getTimelineLaneById(track.markerLaneId) as MarkerLane;
    markerLane.description = name;
    this.store.dispatch(new UpdateTrack(track.id, {name}));
  }

  setActiveTrack(track: SegmentationTrack | undefined) {
    if (this._incompleteMarker) {
      return;
    }
    this.store.dispatch(new SetActiveTrack(track));
  }

  deleteSegmentationTrack(track: SegmentationTrack) {
    this.timelineService.removeTimelineLane(track.markerLaneId);
    this.store.dispatch(new DeleteTrack(track));
  }

  deleteActiveSegmentationTrack() {
    const {segmentationTrack} = this.getActiveTrackAndLane();
    const tracks = this.store.selectSnapshot(SegmentationState.tracks);
    const selectedTrackIndex = tracks.indexOf(segmentationTrack);
    if (selectedTrackIndex > 0) {
      this.setActiveTrack(tracks.at(selectedTrackIndex - 1)!);
    } else if (tracks.length > 1) {
      this.setActiveTrack(tracks.at(selectedTrackIndex + 1)!);
    } else {
      this.setActiveTrack(undefined);
      delete this._markerList;
    }
    this.deleteSegmentationTrack(segmentationTrack);
  }

  addPeriodMarker(timeObservation?: PeriodObservation, isSplit = false): PeriodMarker {
    if (isSplit && this.markerLane && this.markerLane === this.annotationService.annotationLane) {
      const currentAnnotation = this.store.selectSnapshot(AnnotationState.selectedAnnotation);
      return this.annotationService.addPeriodMarker(timeObservation, {body: currentAnnotation?.body});
    }
    const {segmentationTrack, markerLane} = this.getActiveTrackAndLane();
    const marker = new PeriodMarker({
      text: this.resolveHeuristicName(),
      timeObservation: {
        start: timeObservation?.start ?? 0,
        end: timeObservation?.end,
      },
      style: {
        ...Constants.PERIOD_MARKER_STYLE,
        ...LayoutService.themeStyleConstants.PERIOD_MARKER_STYLE_COLORS,
        symbolType: 'triangle',
        selectedAreaOpacity: 0.2,
        color: segmentationTrack.color,
      },
      editable: true,
    });
    this.addMarkerClickHandler(marker, segmentationTrack);
    markerLane.addMarker(marker);
    if (this.selectedMarker && this.annotationService.annotationLane?.getMarker(this.selectedMarker.id)) {
      this.annotationService.annotationLane.toggleMarker(this.selectedMarker.id);
      this.onAnnotationSelected$.next(false);
    }
    markerLane.toggleMarker(marker.id);
    if (!timeObservation?.end) {
      this._incompleteMarker = marker;
    }
    return marker;
  }

  updatePeriodMarker(markerId: string, timeObservation?: Partial<PeriodObservation>, isSplit = false) {
    if (isSplit && this.markerLane && this.markerLane === this.annotationService.annotationLane) {
      return this.annotationService.updatePeriodMarker(markerId, timeObservation);
    }
    if (this._incompleteMarker?.id === markerId) {
      delete this._incompleteMarker;
    }
    const {markerLane} = this.getActiveTrackAndLane();
    markerLane.updateMarker(markerId, {timeObservation});
  }

  updateMomentMarker(markerId: string, timeObservation?: Partial<MomentObservation>) {
    const {markerLane} = this.getActiveTrackAndLane();
    markerLane.updateMarker(markerId, {timeObservation: timeObservation});
  }

  addMomentMarker(timeObservation?: MomentObservation): MomentMarker {
    const {segmentationTrack, markerLane} = this.getActiveTrackAndLane();
    const marker = new MomentMarker({
      text: this.resolveHeuristicName(),
      timeObservation: {
        time: timeObservation?.time ?? 0,
      },
      style: {
        ...Constants.MOMENT_MARKER_STYLE,
        ...LayoutService.themeStyleConstants.MOMENT_MARKER_STYLE_COLORS,
        lineStrokeWidth: 2,
        lineOpacity: 0.2,
        color: segmentationTrack.color,
      },
      editable: true,
    });
    this.addMarkerClickHandler(marker, segmentationTrack);
    markerLane.addMarker(marker);
    if (this.selectedMarker && this.annotationService.annotationLane?.getMarker(this.selectedMarker.id)) {
      this.annotationService.annotationLane.toggleMarker(this.selectedMarker.id);
      this.onAnnotationSelected$.next(false);
    }
    this.markerList!.toggleMarker(marker.id);
    return marker;
  }

  deleteMarker() {
    const marker = this.markerLane?.getSelectedMarker();
    if (marker) {
      if (this.annotationService.annotationLane?.getMarker(marker.id)) {
        this.annotationService.deleteMarker(marker.id);
      } else {
        this.markerLane!.removeMarker(marker.id);
        if (this.selectedMarker?.id === marker.id) {
          this.selectedMarker = undefined;
        }
      }
    }
  }

  toggleMarker(marker: Marker) {
    if (!this.markerList || this._incompleteMarker) {
      return;
    }
    this.markerList.toggleMarker(marker.id);
  }

  selectMarker(marker: Marker) {
    this.markerLane!.toggleMarker(marker.id);
  }

  splitMarker(selectedMarker: PeriodMarker) {
    const selectedMarkerTimeObservation = selectedMarker.timeObservation;
    const selectedMarkerDuration = selectedMarkerTimeObservation.end! - selectedMarkerTimeObservation.start!;
    const selectedMarkerNewEnd = selectedMarker.timeObservation.start! + selectedMarkerDuration / 2;

    const selectedMarkerNewTimeObservation = {
      ...selectedMarker.timeObservation,
      end: selectedMarkerNewEnd,
    };

    const newMarkerStart = selectedMarkerNewEnd + 1 / this.ompApiService.api!.video.getFrameRate();

    this.updatePeriodMarker(selectedMarker.id, selectedMarkerNewTimeObservation, true);

    let newPeriodMarker = this.addPeriodMarker(
      {
        start: newMarkerStart,
        end: selectedMarkerTimeObservation.end,
      },
      true
    );

    const oldColor = newPeriodMarker.style.color;
    const firstSelectStyle = {
      ...newPeriodMarker.style,
      color: LayoutService.themeStyleConstants.COLORS.SEGMENTATION_COLORS.at(-1)!,
    };

    this.markerLane!.updateMarker(newPeriodMarker.id, {style: firstSelectStyle});

    this._recoloredSplitMarker = {
      marker: newPeriodMarker,
      oldColor: oldColor,
    };
  }

  unselectActiveMarker() {
    const activeMarker = this.markerList?.getSelectedMarker();
    if (activeMarker) {
      this.markerList!.toggleMarker(activeMarker.id);

      if (this.layoutService.activeTab !== 'segmentation') {
        this.markerLane!.toggleMarker(activeMarker.id);
      }
    }
  }

  isAnnotationMarkerSelected() {
    return this.selectedMarker && this.annotationService.annotationLane?.getMarker(this.selectedMarker.id);
  }

  unselectAnnotationMarker() {
    if (this.isAnnotationMarkerSelected()) {
      this.annotationService.annotationLane!.toggleMarker(this.selectedMarker!.id);
      this.onAnnotationSelected$.next(false);
    }
  }

  private createMarkerLaneForSegmentationTrack(markerLaneConfig: Partial<MarkerLaneConfig>, index = 1) {
    const markerLane = new MarkerLane({
      ...markerLaneConfig,
    });
    markerLane.onMarkerUpdate$.subscribe({
      next: (event) => {
        this.onMarkerUpdate$.next(event.marker);
      },
    });
    markerLane.onMarkerSelected$.subscribe({
      next: ({marker}) => {
        if (marker) {
          this.selectedMarker = marker;
          this.markerLane = markerLane;
        } else {
          this.selectedMarker = undefined;
        }
      },
    });
    this.ompApiService.api!.timeline!.addTimelineLaneAtIndex(markerLane, index);

    return markerLane;
  }

  private recolorSplitMarker() {
    if (this._recoloredSplitMarker) {
      const newStyle: any = {
        ...this._recoloredSplitMarker.marker.style,
        color: this._recoloredSplitMarker.oldColor,
      };
      if (this.annotationService.annotationLane?.getMarker(this._recoloredSplitMarker.marker.id)) {
        this.annotationService.annotationLane!.updateMarker(this._recoloredSplitMarker.marker.id, {style: newStyle});
      } else if (this.markerLane?.getMarkers().find((marker) => marker.id === this._recoloredSplitMarker!.marker.id)) {
        this.markerLane!.updateMarker(this._recoloredSplitMarker.marker.id, {style: newStyle});
      }

      delete this._recoloredSplitMarker;
    }
  }

  get markerList(): MarkerListApi | undefined {
    return this._markerList;
  }

  set markerList(markerList: MarkerListApi) {
    this.recolorSplitMarker();
    this._markerList = markerList;
  }

  get selectedMarker(): MarkerApi | undefined {
    return this._selectedMarker;
  }

  set selectedMarker(marker: MarkerApi | undefined) {
    this.recolorSplitMarker();
    this._selectedMarker = marker;
  }

  get incompleteMarker() {
    return this._incompleteMarker;
  }

  private getActiveTrackAndLane(): {markerLane: MarkerLane; segmentationTrack: SegmentationTrack} {
    const segmentationTrack = this.store.selectSnapshot(SegmentationState.activeTrack);
    if (!segmentationTrack) {
      throw Error('Unable to create marker without segmentation track');
    }
    return {
      segmentationTrack,
      markerLane: this.timelineService.getTimelineLaneById(segmentationTrack.markerLaneId) as MarkerLane,
    };
  }

  private resolveHeuristicColor(): string {
    const segmentationTracks: {color: string}[] = [...this.store.selectSnapshot(SegmentationState.tracks)];
    const segmentationColors = LayoutService.themeStyleConstants.COLORS.SEGMENTATION_COLORS;
    if (this.annotationService.annotationLane) {
      segmentationTracks.push({color: this.annotationService.annotationColor!});
    }
    const minColorUsage = segmentationColors.reduce((min, color) => Math.min(min, segmentationTracks.filter((track) => track.color === color).length), Infinity);
    return segmentationColors.find((color) => segmentationTracks.filter((track) => track.color === color).length === minColorUsage) ?? segmentationColors[0];
  }

  private resolveHeuristicName(): string {
    const {markerLane} = this.getActiveTrackAndLane();
    const makers = markerLane.getMarkers();
    const maxCount = 100;
    for (let i = 1; i < maxCount; i++) {
      if (!makers.find((m) => m.name?.toLowerCase() === `marker ${i}`)) {
        return `Marker ${i}`;
      }
    }
    return `Marker ${maxCount}`;
  }

  private addMarkerClickHandler(marker: Marker, segmentationTrack: SegmentationTrack) {
    marker.onClick$.subscribe(() => {
      const activeTrack = this.store.selectSnapshot(SegmentationState.activeTrack);
      if (this.layoutService.activeTab !== 'segmentation' && activeTrack && this.selectedMarker && this.selectedMarker.id !== marker.id && this.markerLane !== this.annotationService.annotationLane) {
        this.markerLane!.toggleMarker(this.selectedMarker.id);
      }
      this.unselectAnnotationMarker();
      if (this.markerLane && this.markerLane === this.annotationService.annotationLane) {
        this.markerLane = this.timelineService.getTimelineLaneById(segmentationTrack.markerLaneId) as MarkerLane;
      }
      if (activeTrack?.id !== segmentationTrack.id) {
        this.markerLane = this.timelineService.getTimelineLaneById(segmentationTrack.markerLaneId) as MarkerLane;
        const tracks = this.store.selectSnapshot(SegmentationState.tracks);
        this.store.dispatch(new SetActiveTrack(tracks.find((t) => t.id === segmentationTrack.id)));
        // timeout is needed to propagate the SetActiveTrack event
        setTimeout(() => {
          this.selectMarker(marker);
        });
      } else {
        this.selectMarker(marker);
      }
    });
  }

  set markerLane(value: MarkerLane | undefined) {
    this._markerLane = value;
  }

  get markerLane(): MarkerLane | undefined {
    return this._markerLane;
  }

  get trackMarkersStorage(): Map<SegmentationTrack, Marker[]> {
    return this._trackMarkersStorage;
  }
}
