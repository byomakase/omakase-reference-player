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
import {Subject, Subscription, take} from 'rxjs';
import {TimelineService} from '../../timeline/timeline.service';
import {Marker, MarkerLane, MarkerLaneStyle, MarkerListApi, MomentMarker, MomentObservation, PeriodMarker, PeriodObservation} from '@byomakase/omakase-player';
import {Store} from '@ngxs/store';
import {Constants} from '../../../shared/constants/constants';
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

  onMarkerUpdate$ = new Subject<MarkerApi>();

  constructor(
    private timelineService: TimelineService,
    private store: Store,
    private ompApiService: OmpApiService,
    private layoutService: LayoutService
  ) {}

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

  createSegmentationTrack(name?: string) {
    if (this._incompleteMarker) {
      return;
    }
    const segmentationTrackCount = this.store.selectSnapshot(SegmentationState.tracks).length;
    if (!name) {
      name = `Segmentation ${this._segmentationCounter}`;
      this._segmentationCounter++;
    }
    let color = this.resolveHeuristicColor();
    let style: Partial<MarkerLaneStyle> = {
      ...Constants.MARKER_LANE_STYLE,
      markerStyle: {
        color,
      },
    };
    const markerLane = new MarkerLane({
      description: name,
      style: {
        ...style,
      },
    });
    markerLane.onMarkerUpdate$.subscribe({
      next: (event) => {
        this.onMarkerUpdate$.next(event.marker);
      },
    });
    this.timelineService.addTimelineLaneAtIndex(markerLane, segmentationTrackCount + 1);
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

  addPeriodMarker(timeObservation?: PeriodObservation): PeriodMarker {
    const {segmentationTrack, markerLane} = this.getActiveTrackAndLane();
    const marker = new PeriodMarker({
      text: this.resolveHeuristicName(),
      timeObservation: {
        start: timeObservation?.start ?? 0,
        end: timeObservation?.end,
      },
      style: {
        ...Constants.PERIOD_MARKER_STYLE,
        symbolType: 'triangle',
        selectedAreaOpacity: 0.2,
        color: segmentationTrack.color,
      },
      editable: true,
    });
    this.addMarkerClickHandler(marker, segmentationTrack);
    markerLane.addMarker(marker);
    this.markerList!.toggleMarker(marker.id);
    if (!timeObservation?.end) {
      this._incompleteMarker = marker;
    }
    return marker;
  }

  updatePeriodMarker(markerId: string, timeObservation?: Partial<PeriodObservation>) {
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
        lineStrokeWidth: 2,
        lineOpacity: 0.2,
        color: segmentationTrack.color,
      },
      editable: true,
    });
    this.addMarkerClickHandler(marker, segmentationTrack);
    markerLane.addMarker(marker);
    this.markerList!.toggleMarker(marker.id);
    return marker;
  }

  deleteMarker() {
    const marker = this._markerList?.getSelectedMarker();
    if (marker) {
      this._markerList!.removeMarker(marker.id);
      console.log(this._markerList?.getSelectedMarker());
    }
  }

  toggleMarker(marker: Marker) {
    if (!this.markerList || this._incompleteMarker) {
      return;
    }
    this.markerList.toggleMarker(marker.id);
  }

  selectMarker(marker: Marker) {
    if (this.layoutService.activeTab === 'segmentation') {
      if (!this.markerList || this._incompleteMarker) {
        return;
      }
      const selectedMarker = this.markerList.getSelectedMarker();
      if (marker.id !== selectedMarker?.id) {
        this.markerList.toggleMarker(marker.id);
      }
    } else {
      this.markerLane!.toggleMarker(marker.id);
      this.selectedMarker = marker;
    }
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

    this.updatePeriodMarker(selectedMarker.id, selectedMarkerNewTimeObservation);

    let newPeriodMarker = this.addPeriodMarker({
      start: newMarkerStart,
      end: selectedMarkerTimeObservation.end,
    });

    const oldColor = newPeriodMarker.style.color;
    const firstSelectStyle = {
      ...newPeriodMarker.style,
      color: Constants.VARIABLES.segmentationColors.at(-1)!,
    };

    this.markerList!.updateMarker(newPeriodMarker.id, {style: firstSelectStyle});

    this._recoloredSplitMarker = {
      marker: newPeriodMarker,
      oldColor: oldColor,
    };
  }

  unselectActiveMarker() {
    const activeMarker = this.markerList?.getSelectedMarker();
    if (activeMarker) {
      this.markerList!.toggleMarker(activeMarker.id);

      if (this.layoutService.activeTab === 'qc') {
        this.markerLane!.toggleMarker(activeMarker.id);
        this.selectedMarker = activeMarker;
      }
    }
  }

  private recolorSplitMarker() {
    if (this._recoloredSplitMarker) {
      const newStyle = {
        ...this._recoloredSplitMarker.marker.style,
        color: this._recoloredSplitMarker.oldColor,
      };
      if (this.markerList?.getMarkers().find((marker) => marker.id === this._recoloredSplitMarker!.marker.id)) {
        this.markerList!.updateMarker(this._recoloredSplitMarker.marker.id, {style: newStyle});
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
    const segmentationTracks = this.store.selectSnapshot(SegmentationState.tracks);
    const segmentationColors = Constants.VARIABLES.segmentationColors;
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
      if (this.layoutService.activeTab === 'qc' && activeTrack && this.selectedMarker) {
        this.markerLane!.toggleMarker(this.selectedMarker.id);
      }
      if (activeTrack?.id !== segmentationTrack.id) {
        this.markerLane = this.timelineService.getTimelineLaneById(segmentationTrack.markerLaneId) as MarkerLane;
        this.store.dispatch(new SetActiveTrack(segmentationTrack));
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
}
