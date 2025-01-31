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

import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, OnDestroy, Output} from '@angular/core';
import {ConfigWithOptionalStyle, MarkerLane, TimelineApi, TimelineConfig} from '@byomakase/omakase-player';
import {Subject, take, takeUntil} from 'rxjs';
import {CryptoUtil} from '../../../../util/crypto-util';
import {OmpApiService} from '../omp-api.service';
import {LayoutService} from '../../../../core/layout/layout.service';
import {Store} from '@ngxs/store';
import {SegmentationState} from '../../../../features/main/segmentation/segmentation.state';
import {SegmentationService} from '../../../../features/main/segmentation-list/segmentation.service';
import {Constants} from '../../../constants/constants';
import {TimelineConfiguratorState} from '../../../../features/main/timeline-configurator/timeline-configurator.state';
import {BaseGroupingLane} from './grouping/base-grouping-lane';

@Component({
  selector: 'div[appOmakasePlayerTimeline]',
  standalone: true,
  imports: [],
  template: ` <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OmakasePlayerTimelineComponent implements OnDestroy {
  @Output()
  readonly onReady: EventEmitter<{
    timelineApi: TimelineApi;
    baseGroupingLanes: BaseGroupingLane<any>[];
  }> = new EventEmitter<{
    timelineApi: TimelineApi;
    baseGroupingLanes: BaseGroupingLane<any>[];
  }>();

  private _baseGroupingLanes: BaseGroupingLane<any>[] = [];

  private _config: Partial<ConfigWithOptionalStyle<TimelineConfig>> | undefined;
  private _presetConfig: Partial<ConfigWithOptionalStyle<TimelineConfig>>;

  private _onDestroy$ = new Subject<void>();

  constructor(
    protected ompApiService: OmpApiService,
    protected layoutService: LayoutService,
    protected store: Store,
    protected segmentationService: SegmentationService
  ) {
    this._presetConfig = {
      timelineHTMLElementId: CryptoUtil.uuid(),
    };

    this._config = {
      ...this._presetConfig,
      style: {
        ...Constants.TIMELINE_CONFIG.style,
        ...LayoutService.themeStyleConstants.TIMELINE_CONFIG_STYLE_COLORS.style,
      },
    };

    this.ompApiService.onCreate$.pipe(takeUntil(this._onDestroy$)).subscribe({
      next: (omakasePlayerApi) => {
        if (omakasePlayerApi) {
          this.createTimeline();
        } else {
          // this.destroyTimeline()
        }
      },
      error: (err) => {},
    });

    this.layoutService.presentationMode$.pipe(takeUntil(this._onDestroy$)).subscribe({
      next: (presentationMode) => {
        if (this.ompApiService.api?.timeline) {
          const tracks = this.store.selectSnapshot(SegmentationState.tracks);
          const activeTrack = this.store.selectSnapshot(SegmentationState.activeTrack);
          const marker = this.segmentationService.selectedMarker;
          tracks.forEach((track) => {
            const lane = this.ompApiService.api!.timeline!.getTimelineLane(track.markerLaneId) as MarkerLane;
            const markers = [...lane.getMarkers()];

            if (activeTrack?.id === track.id && this.layoutService.activeTab === 'segmentation') {
              this.segmentationService.markerList?.destroy();
            }

            this.segmentationService.trackMarkersStorage.set(track, markers);
          });

          this._config = {
            ...this.config,
            style: {
              ...Constants.TIMELINE_CONFIG.style,
              ...LayoutService.themeStyleConstants.TIMELINE_CONFIG_STYLE_COLORS.style,
            },
          };

          const laneOptions = this.store.selectSnapshot(TimelineConfiguratorState.laneOptions);
          laneOptions.forEach((laneOption) => {
            const baseGroupingLane = this.ompApiService
              .api!.timeline!.getTimelineLanes()
              .find((lane) => lane instanceof BaseGroupingLane && lane.description.split(' ')[0] === laneOption.label.split(' - ')[0]) as BaseGroupingLane<any>;

            if (baseGroupingLane) {
              this._baseGroupingLanes.push(baseGroupingLane);
            }
          });

          this.ompApiService.api!.timeline.destroy();
          this.segmentationService.selectedMarker = marker;
          this.createTimeline();
        }
      },
    });
  }

  ngOnDestroy() {
    // this.destroyTimeline();
    if (this.ompApiService.api?.timeline) {
      this.ompApiService.api.timeline.destroy();
    }
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return this.config?.timelineHTMLElementId;
  }

  @HostBinding('class')
  get hostElementClass(): string | undefined {
    return 'app-omakase-player-timeline';
  }

  private createTimeline() {
    // this.destroyTimeline();

    if (this.config) {
      this.ompApiService.api!.createTimeline(this.config).subscribe({
        next: (timeline) => {
          timeline.onReady$.pipe(take(1)).subscribe({
            next: () => {
              this.onReady.emit({
                timelineApi: timeline,
                baseGroupingLanes: this._baseGroupingLanes,
              });
            },
          });
        },
      });
    }
  }

  // private destroyTimeline() {
  //   if (this.ompApiService.api?.timeline) {
  //     this.ompApiService.api.timeline.destroy();
  //   }
  // }

  get config(): Partial<ConfigWithOptionalStyle<TimelineConfig>> | undefined {
    return this._config;
  }
}
