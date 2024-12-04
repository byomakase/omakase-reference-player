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

import {Component, EventEmitter, HostBinding, Input, Output} from '@angular/core';
import {NgbDropdown, NgbDropdownButtonItem, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle} from '@ng-bootstrap/ng-bootstrap';
import {GroupingLaneVisibility} from '../omakase-player/omakase-player-timeline/grouping/base-grouping-lane';
import {BehaviorSubject, filter, first, Subject, takeUntil} from 'rxjs';
import {IconModule} from '../icon/icon.module';
import {completeSub} from '../../../util/rx-util';
import {OmpApiService} from '../omakase-player/omp-api.service';
import {MomentMarker, MomentObservation, PeriodMarker, PeriodObservation, TimeObservation} from '@byomakase/omakase-player';
import {SegmentationService} from '../../../features/main/segmentation-list/segmentation.service';
import {MarkerApi} from '@byomakase/omakase-player/dist/api/marker-api';
import {DropdownComponent, DropdownOption} from '../dropdown/dropdown.component';
import {CommonModule} from '@angular/common';
import { CheckboxComponent } from '../checkbox/checkbox.component';

@Component({
  selector: 'div[appTimelineControls]',
  standalone: true,
  imports: [NgbDropdown, NgbDropdownButtonItem, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle, DropdownComponent, CommonModule, IconModule, CheckboxComponent],
  template: `
    <div>
      <div class="btn-group" role="group">
        <button
          type="button"
          class="btn"
          [class.btn-minimize]="visibilityToToggle === 'minimized'"
          [class.btn-maximize]="visibilityToToggle === 'maximized'"
          [disabled]="isDisabled"
          (click)="buttonClickChangeVisibility()"
        ></button>
        @if (activeTab === 'segmentation') {
          <button type="button" class="btn play-back-forward" (click)="moveCTIToMarker('start')" [disabled]="!segmentationService.selectedMarker">
            <i appIcon="bracket-double-left"></i>
          </button>
          <button type="button" class="btn play-back-forward" (click)="moveCTIToMarker('end')" [disabled]="!segmentationService.selectedMarker">
            <i appIcon="bracket-double-right"></i>
          </button>
          <button type="button" class="btn play-back-forward" (click)="setSelectedMarkerStartToCTI()" [disabled]="!isMarkerStartToCTIValid">
            <i appIcon="bracket-left"></i>
          </button>
          <button type="button" class="btn play-back-forward" (click)="setSelectedMarkerEndToCTI()" [disabled]="!isMarkerEndToCTIValid">
            <i appIcon="bracket-right"></i>
          </button>
          <button type="button" class="btn marker-add" (click)="addMarker()">
            <i [appIcon]="incompleteMarker ? 'marker-end' : 'marker-start'"></i>
          </button>
          <button type="button" class="btn marker-delete" (click)="deleteMarker()" [disabled]="!segmentationService.selectedMarker">
            <i appIcon="marker-delete"></i>
          </button>
          <button type="button" class="btn marker-delete" (click)="splitMarker()" [disabled]="!isMarkerSplitValid">
            <i appIcon="marker-split"></i>
          </button>
          <button type="button" class="btn marker-add" (click)="addPoint()" [disabled]="incompleteMarker">
            <i appIcon="point"></i>
          </button>
        }
        <button type="button" class="btn play-back-forward" (click)="playLastNSeconds(3)" [disabled]="isVideoAtStart">
          <i appIcon="play-back-3"></i>
        </button>
        <button type="button" class="btn play-back-forward" (click)="playNextNSeconds(3)" [disabled]="isVideoAtEnd">
          <i appIcon="play-forward-3"></i>
        </button>
      </div>
      @if (timelineLanesAdded$ | async) {
        @if (dropdownGroupOptions?.length) {
          <div class="btn-group limit-group" ngbDropdown role="group" [autoClose]="'outside'" (openChange)="handleGroupDropdownOpenChange($event)">
            <button type="button " [class.group-dropdown-active]="numberOfSelected" class="btn-dropdown btn-primary " ngbDropdownToggle>
              Limit to
              @if (numberOfSelected) {
                {{ numberOfSelected }}
              }
              @if (groupingDropdownOpened) {
                <i class="flex-icon" appIcon="arrow-up"></i>
              } @else {
                <i class="flex-icon" appIcon="arrow-down"></i>
              }
            </button>
            <div class="dropdown-menu" ngbDropdownMenu>
              <div class="form-check">
                @for (item of dropdownGroupOptions; track item.value) {
                  <app-checkbox [label]="item.value" [isChecked]="selectedGroupsMap.get(item.value) ?? false " (onChecked)="handleDropdownClick(item.value)"></app-checkbox>
                }
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  //changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineControlsComponent {
  public incompleteMarker?: PeriodMarker;

  private _visibility: GroupingLaneVisibility = 'maximized';
  private _disabled: boolean = false;

  private _onTimeChangeBreaker$ = new Subject<void>();
  private _onEndedBreaker$ = new Subject<void>();
  private _destroyed$ = new Subject<void>();

  groupingDropdownOpened = false;
  selectedGroupsMap: Map<string, boolean> = new Map();
  @Input()
  analysisGroups!: Map<string, string[]>;
  selectedGroupsMapChanged: boolean = false;

  get numberOfSelected() {
    let numberOfTrue = [...this.selectedGroupsMap.values()].reduce<number>((previousValue, currentValue) => {
      if (currentValue) {
        previousValue++;
      }
      return previousValue;
    }, 0);

    return numberOfTrue;
  }

  constructor(
    protected ompApiService: OmpApiService,
    protected segmentationService: SegmentationService
  ) {
    this.ompApiService.onCreate$
      .pipe(
        filter((p) => !!p),
        takeUntil(this._destroyed$)
      )
      .subscribe({
        next: () => {},
      });
  }

  @Input() activeTab!: string;

  @Input()
  set visibility(value: GroupingLaneVisibility) {
    this._visibility = value;
  }

  @Input()
  set disabled(value: boolean) {
    this._disabled = value;
  }

  @Input()
  timelineLanesAdded$: BehaviorSubject<boolean> | undefined = undefined;

  @Output()
  readonly groupingLanesVisibilityTrigger: EventEmitter<GroupingLaneVisibility> = new EventEmitter<GroupingLaneVisibility>();

  @Output()
  readonly analysisGroupsVisibleChangedTrigger: EventEmitter<Map<string, boolean>> = new EventEmitter<Map<string, boolean>>();

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'timeline-controls';
  }

  dropdownGroupOptions: DropdownOption<string>[] | undefined = undefined;

  @HostBinding('class')
  get hostElementClass(): string | undefined {
    return 'd-flex justify-content-between';
  }

  ngOnInit(): void {
    this.timelineLanesAdded$?.subscribe({
      next: (value: boolean) => {
        if (value) {
          this.dropdownGroupOptions = this.analysisGroupsToDropdownOptions();
          this.selectedGroupsMap = this.dropdownOptionsToMap(this.dropdownGroupOptions);
        }
      },
    });
  }

  handleGroupDropdownOpenChange(isOpened: boolean) {
    if (isOpened) {
      this.groupingDropdownOpened = true;
    } else {
      this.groupingDropdownOpened = false;
    }
  }

  handleDropdownClick(id: string) {
    if (this.selectedGroupsMap.has(id)) {
      this.selectedGroupsMap.set(id, !this.selectedGroupsMap.get(id));
      this.analysisGroupsVisibleChangedTrigger.emit(this.selectedGroupsMap);
    }
  }

  private analysisGroupsToDropdownOptions() {
    let groups = [...this.analysisGroups.keys()];
    groups.sort();
    let dropwdownGroupOptions = groups.map((group: string) => {
      let label = group.replaceAll('-', ' ').replaceAll('_', ' ');
      let value = group;

      return {label: label, value: value} as DropdownOption<string>;
    });

    return dropwdownGroupOptions;
  }

  private dropdownOptionsToMap(dropdownoptions: DropdownOption<string>[]) {
    const map = new Map(dropdownoptions.map((option) => [option.value, false]));
    return map;
  }

  buttonClickChangeVisibility() {
    this.groupingLanesVisibilityTrigger.next(this.visibilityToToggle);
  }

  playLastNSeconds(timeInSec: number) {
    if (!this.ompApiService.api) {
      return;
    }

    if (this._onTimeChangeBreaker$) {
      completeSub(this._onTimeChangeBreaker$);
    }
    this._onTimeChangeBreaker$ = new Subject();

    this.ompApiService.api!.video.pause();

    const stopFrame = this.ompApiService.api!.video.getCurrentFrame();
    const frameRate = this.ompApiService.api!.video.getFrameRate();
    const desiredStartFrame = stopFrame - timeInSec * frameRate;
    const startFrame = desiredStartFrame >= 0 ? desiredStartFrame : 0;

    this.ompApiService
      .api!.video.seekToFrame(startFrame)
      .pipe(first())
      .subscribe(() => {});

    this.ompApiService.api!.video.play();

    this.ompApiService.api!.video.onVideoTimeChange$.pipe(takeUntil(this._onTimeChangeBreaker$)).subscribe((event) => {
      if (event.frame >= stopFrame - 1) {
        this.ompApiService.api!.video.pause().subscribe(() => {
          this.ompApiService
            .api!.video.seekToFrame(stopFrame)
            .pipe(first())
            .subscribe(() => {});
        });

        completeSub(this._onTimeChangeBreaker$);
      }
    });
  }

  playNextNSeconds(timeInSec: number) {
    if (!this.ompApiService.api) {
      return;
    }

    if (this._onTimeChangeBreaker$) {
      completeSub(this._onTimeChangeBreaker$);
    }
    this._onTimeChangeBreaker$ = new Subject();

    if (this._onEndedBreaker$) {
      completeSub(this._onEndedBreaker$);
    }
    this._onEndedBreaker$ = new Subject();

    const startFrame = this.ompApiService.api!.video.getCurrentFrame();
    const frameRate = this.ompApiService.api!.video.getFrameRate();
    const stopFrame = startFrame + timeInSec * frameRate;

    this.ompApiService.api!.video.play();

    this.ompApiService.api!.video.onVideoTimeChange$.pipe(takeUntil(this._onTimeChangeBreaker$)).subscribe((event) => {
      if (event.frame >= stopFrame - 1) {
        this.ompApiService.api!.video.pause().subscribe(() => {
          this.ompApiService
            .api!.video.seekToFrame(startFrame)
            .pipe(first())
            .subscribe(() => {});
        });

        completeSub(this._onTimeChangeBreaker$);
      }
    });

    this.ompApiService.api!.video.onEnded$.pipe(takeUntil(this._onEndedBreaker$)).subscribe((event) => {
      setTimeout(() => {
        this.ompApiService
          .api!.video.seekToFrame(startFrame)
          .pipe(first())
          .subscribe(() => {});
      }, 1);

      completeSub(this._onEndedBreaker$);
    });
  }

  addMarker() {
    if (this.incompleteMarker) {
      const timeObservation = {
        start: this.incompleteMarker.timeObservation.start,
        end: this.ompApiService.api!.video.getCurrentTime(),
      };
      this.segmentationService.updatePeriodMarker(this.incompleteMarker.id, timeObservation);
      this.incompleteMarker = undefined;
    } else {
      const timeObservation = {
        start: this.ompApiService.api!.video.getCurrentTime(),
      };
      this.incompleteMarker = this.segmentationService.addPeriodMarker(timeObservation);
    }
  }

  deleteMarker() {
    this.segmentationService.deleteMarker();
  }

  addPoint() {
    const timeObservation = {
      time: this.ompApiService.api!.video.getCurrentTime(),
    };
    this.segmentationService.addMomentMarker(timeObservation);
  }

  splitMarker() {
    const selectedMarker = this.segmentationService.selectedMarker;
    if (selectedMarker && this.isPeriodMarker(selectedMarker)) {
      this.segmentationService.splitMarker(selectedMarker);
    }
  }

  moveCTIToMarker(position: 'start' | 'end') {
    const selectedMarker = this.segmentationService.selectedMarker;

    if (selectedMarker) {
      if (this.isPeriodMarker(selectedMarker)) {
        if (position === 'start' && selectedMarker.timeObservation.start) {
          this.ompApiService.api?.video.seekToTime(selectedMarker.timeObservation.start);
        } else if (position === 'end' && selectedMarker.timeObservation.end) {
          this.ompApiService.api?.video.seekToTime(selectedMarker.timeObservation.end);
        }
      } else if (this.isMomentMarker(selectedMarker)) {
        this.ompApiService.api?.video.seekToTime(selectedMarker.timeObservation.time);
      }
    }
  }

  setSelectedMarkerStartToCTI() {
    let selectedMarker = this.segmentationService.selectedMarker;
    if (selectedMarker) {
      let oldTimeObservation = selectedMarker.timeObservation as PeriodObservation | MomentObservation;

      if (this.isPeriodObservation(oldTimeObservation)) {
        let newTimeObservation = {...oldTimeObservation, start: this.ompApiService.api?.video.getCurrentTime()};
        this.segmentationService.updatePeriodMarker(selectedMarker.id, newTimeObservation);
      } else if (this.isMomentObservation(oldTimeObservation)) {
        let newTimeObservation = {...oldTimeObservation, time: this.ompApiService.api?.video.getCurrentTime()!};
        this.segmentationService.updateMomentMarker(selectedMarker.id, newTimeObservation);
      }
    }
  }

  setSelectedMarkerEndToCTI() {
    let selectedMarker = this.segmentationService.selectedMarker;
    if (selectedMarker) {
      let oldTimeObservation = selectedMarker.timeObservation as PeriodObservation | MomentObservation;

      if (this.isPeriodObservation(oldTimeObservation)) {
        let newTimeObservation = {...oldTimeObservation, end: this.ompApiService.api?.video.getCurrentTime()};
        this.segmentationService.updatePeriodMarker(selectedMarker.id, newTimeObservation);
      } else if (this.isMomentObservation(oldTimeObservation)) {
        let newTimeObservation = {...oldTimeObservation, time: this.ompApiService.api?.video.getCurrentTime()};
        this.segmentationService.updateMomentMarker(selectedMarker.id, newTimeObservation);
      }
    }
  }

  get isMarkerSplitValid(): boolean {
    const selectedMarker = this.segmentationService.selectedMarker;

    if (selectedMarker && this.isPeriodMarker(selectedMarker) && selectedMarker.timeObservation.end) {
      const startFrame = this.ompApiService.api!.video.calculateTimeToFrame(selectedMarker.timeObservation.start!);
      const minimalEndTime = this.ompApiService.api!.video.calculateFrameToTime(startFrame + 2);

      if (minimalEndTime < selectedMarker.timeObservation.end) {
        return true;
      }
    }

    return false;
  }

  get isMarkerStartToCTIValid(): boolean {
    let selectedMarker = this.segmentationService.selectedMarker;
    if (selectedMarker) {
      if (this.isMomentMarker(selectedMarker)) {
        return true;
      }

      if (this.isPeriodMarker(selectedMarker)) {
        if (!selectedMarker.timeObservation.end) {
          return true;
        }
        if (selectedMarker.timeObservation.start && this.ompApiService.api) {
          if (selectedMarker.timeObservation.end >= this.ompApiService.api?.video.getCurrentTime()) {
            return true;
          }
        }
      }
    }

    return false;
  }

  get isMarkerEndToCTIValid(): boolean {
    let selectedMarker = this.segmentationService.selectedMarker;
    if (selectedMarker) {
      if (this.isMomentMarker(selectedMarker)) {
        return true;
      }

      if (this.isPeriodMarker(selectedMarker)) {
        if (!selectedMarker.timeObservation.start) {
          return true;
        }
        if (selectedMarker.timeObservation.end && this.ompApiService.api) {
          if (selectedMarker.timeObservation.start <= this.ompApiService.api?.video.getCurrentTime()) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private isPeriodMarker(marker: MarkerApi): marker is PeriodMarker {
    return this.isPeriodObservation(marker.timeObservation);
  }

  private isMomentMarker(marker: MarkerApi): marker is MomentMarker {
    return this.isMomentObservation(marker.timeObservation);
  }

  private isPeriodObservation(observation: TimeObservation): observation is PeriodObservation {
    if ('start' in observation) {
      return true;
    }
    return false;
  }

  private isMomentObservation(observation: TimeObservation): observation is MomentObservation {
    if ('time' in observation) {
      return true;
    }
    return false;
  }

  get visibilityToToggle(): GroupingLaneVisibility {
    return this._visibility;
  }

  get isDisabled(): boolean {
    return this._disabled;
  }

  get isVideoLoaded(): boolean {
    return !this.ompApiService.api || (this.ompApiService.api && !this.ompApiService.api!.video.isVideoLoaded());
  }

  get isVideoAtStart(): boolean {
    if (this.isVideoLoaded) {
      return true;
    }

    const currentFrame = this.ompApiService.api!.video.getCurrentFrame();

    return currentFrame ? currentFrame <= 10 : true;
  }

  get isVideoAtEnd(): boolean {
    if (this.isVideoLoaded) {
      return true;
    }

    const currentFrame = this.ompApiService.api!.video.getCurrentFrame();
    const totalFrames = this.ompApiService.api!.video.getTotalFrames();

    return totalFrames && currentFrame !== undefined ? totalFrames - currentFrame <= 10 : true;
  }
}
