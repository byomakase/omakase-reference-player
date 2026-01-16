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

import {Component, EventEmitter, HostBinding, HostListener, Input, Output} from '@angular/core';
import {NgbDropdown, NgbDropdownMenu, NgbDropdownToggle} from '@ng-bootstrap/ng-bootstrap';
import {GroupingLaneVisibility} from '../omakase-player/omakase-player-timeline/grouping/base-grouping-lane';
import {BehaviorSubject, filter, first, Subject, takeUntil} from 'rxjs';
import {IconModule} from '../icon/icon.module';
import {completeSub} from '../../../util/rx-util';
import {OmpApiService} from '../omakase-player/omp-api.service';
import {Marker, MarkerApi, MomentMarker, MomentObservation, PeriodMarker, PeriodObservation, TimeObservation, VideoLoadedEvent, VideoTimeChangeEvent} from '@byomakase/omakase-player';
import {SegmentationService} from '../../../features/main/segmentation-list/segmentation.service';
import {DropdownOption} from '../dropdown/dropdown.component';
import {CommonModule} from '@angular/common';
import {CheckboxComponent} from '../checkbox/checkbox.component';
import {IconName} from '../icon/icon.service';
import {ColorPickerComponent} from '../color-picker/color-picker.component';
import {Store} from '@ngxs/store';
import {SegmentationState, SegmentationTrack} from '../../../features/main/segmentation/segmentation.state';
import {LayoutService} from '../../../core/layout/layout.service';
import {AnnotationService} from '../../../features/main/annotation/annotation.service';

const INACTIVE_SEGMENTATION_COLOR = '#cccccc';

@Component({
    selector: 'div[appTimelineControls]',
    imports: [NgbDropdown, NgbDropdownMenu, NgbDropdownToggle, CommonModule, IconModule, CheckboxComponent, ColorPickerComponent],
    template: `
    <div>
      <div class="btn-group" role="group">
        <button type="button" class="btn btn-minimize-maximize" [disabled]="isDisabled" (click)="buttonClickChangeVisibility()">
          <i [appIcon]="iconName"></i>
        </button>
        <button type="button" class="btn play-back-forward" (click)="moveCTIToMarker('start')" [disabled]="!segmentationService.selectedMarker">
          <i appIcon="bracket-double-left"></i>
        </button>
        <button type="button" class="btn play-back-forward" (click)="moveCTIToMarker('end')" [disabled]="!segmentationService.selectedMarker">
          <i appIcon="bracket-double-right"></i>
        </button>
        @if (isSegmentationEnabled || isAnnotationEnabled) {
          <button type="button" class="btn play-back-forward" (click)="setSelectedMarkerStartToCTI()" [disabled]="!isMarkerStartToCTIValid">
            <i appIcon="bracket-left"></i>
          </button>
          <button type="button" class="btn play-back-forward" (click)="setSelectedMarkerEndToCTI()" [disabled]="!isMarkerEndToCTIValid">
            <i appIcon="bracket-right"></i>
          </button>
          <button type="button" class="btn marker-add" (click)="addMarker()" [disabled]="(!isSegmentationActive() && !isAnnotationActive()) || (hasIncompleteMarker() && !canEndMarker)">
            <i [appIcon]="hasIncompleteMarker() ? 'marker-end' : 'marker-start'"></i>
          </button>
          <button type="button" class="btn marker-delete" (click)="deleteMarker()" [disabled]="!segmentationService.selectedMarker">
            <i appIcon="marker-delete"></i>
          </button>
          <button type="button" class="btn marker-delete" (click)="splitMarker()" [disabled]="!isMarkerSplitValid">
            <i appIcon="marker-split"></i>
          </button>
          <button type="button" class="btn marker-add" (click)="addPoint()" [disabled]="!isSegmentationActive() && !isAnnotationActive()">
            <i appIcon="point"></i>
          </button>
        }
        <button type="button" class="btn play-back-forward" (click)="playLastNSeconds(3)" [disabled]="!playLastNSecondsEnabled">
          <i appIcon="play-back-3"></i>
        </button>
        <button type="button" class="btn play-back-forward" (click)="playNextNSeconds(3)" [disabled]="!playNextNSecondsEnabled">
          <i appIcon="play-forward-3"></i>
        </button>

        <button type="button" class="btn loop" (click)="loopMarker()" [disabled]="!isLoopEnabled">
          <i appIcon="loop"></i>
        </button>
      </div>
      @if (timelineLanesAdded$ | async) {
        @if (dropdownGroupOptions?.length) {
          <div class="btn-group limit-group" ngbDropdown role="group" [autoClose]="'outside'" (openChange)="handleGroupDropdownOpenChange($event)">
            <button type="button" [class.group-dropdown-active]="numberOfSelected" [class.border-right]="!isSegmentationEnabled" class="btn-dropdown btn-primary " ngbDropdownToggle>
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
                  <app-checkbox [label]="item.value" [isChecked]="selectedGroupsMap.get(item.value) ?? false" (onChecked)="handleDropdownClick(item.value)"></app-checkbox>
                }
              </div>
            </div>
          </div>
        }
      }
      @if (isSegmentationEnabled || isAnnotationEnabled) {
        <div class="segmentation-controls">
          <div
            class="segmentation-list-item-color"
            [ngStyle]="{'background-color': isAnnotationColorPickerActive() ? annotationService.annotationColor : getSegmentationColor()}"
            (click)="!editingSegmentationColor ? openColorPicker() : closeColorPicker()"
          ></div>
          @if (editingSegmentationColor) {
            <div class="segmentation-color-dropdown">
              @if (isAnnotationColorPickerActive()) {
                <app-color-picker
                  [colors]="segmentationColors"
                  [activeColor]="annotationService.annotationColor"
                  (selectedColor)="setAnnotationColor($event)"
                  (clickOutside)="closeColorPicker()"
                ></app-color-picker>
              } @else {
                <app-color-picker
                  [colors]="segmentationColors"
                  [activeColor]="getSegmentationColor()"
                  (selectedColor)="setSegmentationColor($event)"
                  (clickOutside)="closeColorPicker()"
                ></app-color-picker>
              }
            </div>
          }
        </div>
        @if (isSegmentationEnabled) {
          <div class="segmentation-add" (click)="addSegmentationTrack()">
            <i appIcon="add" title="Create segmentation track"></i>
            NEW SEGMENTATION
          </div>
        }
      }
      <button type="button" class="btn btn-gear" (click)="timelineConfiguratorPanelClick()" [class.d-none]="isVisible">
        <i appIcon="gear"></i>
      </button>
    </div>
  `
})
export class TimelineControlsComponent {
  groupingDropdownOpened = false;

  @Input()
  selectedGroupsMap!: Map<string, boolean>;

  segmentationColor = INACTIVE_SEGMENTATION_COLOR;
  editingSegmentationColor = false;
  segmentationColors = LayoutService.themeStyleConstants.COLORS.SEGMENTATION_COLORS;
  segmentationTrack?: SegmentationTrack;
  isAnnotationSelected = false;

  private _analysisGroups?: Map<string, string[]>;

  @Input()
  set analysisGroups(value: Map<string, string[]>) {
    this._analysisGroups = value;
  }

  @Input() activeTab!: string;
  @Input() timelineLanesAdded$: BehaviorSubject<boolean> | undefined = undefined;
  @Input() isSegmentationEnabled = false;
  @Input() isAnnotationEnabled = false;

  dropdownGroupOptions: DropdownOption<string>[] | undefined = undefined;

  private _videoLoadedEvent: VideoLoadedEvent | undefined;
  private _videoTimeChangeEvent: VideoTimeChangeEvent | undefined;

  private _visibility: GroupingLaneVisibility = 'maximized';
  private _visible: boolean = true;
  private _disabled: boolean = false;

  private _onTimeChangeBreaker$ = new Subject<void>();
  private _onEndedBreaker$ = new Subject<void>();
  private _destroyed$ = new Subject<void>();

  constructor(
    protected ompApiService: OmpApiService,
    protected segmentationService: SegmentationService,
    public annotationService: AnnotationService,
    protected layoutService: LayoutService,
    protected store: Store
  ) {
    this.ompApiService.onCreate$
      .pipe(
        filter((p) => !!p),
        takeUntil(this._destroyed$)
      )
      .subscribe({
        next: () => {
          this.ompApiService.api!.video.onVideoLoaded$.pipe(takeUntil(this._destroyed$)).subscribe({
            next: (event) => {
              this._videoLoadedEvent = event;
            },
          });

          this.ompApiService.api!.video.onVideoTimeChange$.pipe(takeUntil(this._destroyed$)).subscribe({
            next: (event) => {
              this._videoTimeChangeEvent = event;
            },
          });
        },
      });
    this.store
      .select(SegmentationState.activeTrack)
      .pipe(takeUntil(this._destroyed$))
      .subscribe({
        next: (track) => {
          this.segmentationColor = track?.color ?? INACTIVE_SEGMENTATION_COLOR;
          this.segmentationTrack = track;
        },
      });
    this.segmentationService.onAnnotationSelected$.pipe(takeUntil(this._destroyed$)).subscribe({
      next: (isAnnotationSelected) => {
        this.isAnnotationSelected = isAnnotationSelected;
      },
    });
  }

  @Input()
  set visibility(value: GroupingLaneVisibility) {
    this._visibility = value;
  }

  @Input()
  set visible(value: boolean) {
    this._visible = value;
  }

  @Input()
  set disabled(value: boolean) {
    this._disabled = value;
  }

  @Output()
  readonly groupingLanesVisibilityTrigger: EventEmitter<GroupingLaneVisibility> = new EventEmitter<GroupingLaneVisibility>();

  @Output()
  readonly analysisGroupsVisibleChangedTrigger: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  readonly timelineConfiguratorPanelTrigger: EventEmitter<void> = new EventEmitter<void>();

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'timeline-controls';
  }

  @HostBinding('class')
  get hostElementClass(): string | undefined {
    return 'd-flex justify-content-between';
  }

  ngOnInit(): void {
    this.timelineLanesAdded$?.subscribe({
      next: (value: boolean) => {
        if (value) {
          this.dropdownGroupOptions = this.analysisGroupsToDropdownOptions();
          // this.selectedGroupsMap = this.dropdownOptionsToMap(this.dropdownGroupOptions);
        }
      },
    });
  }

  handleGroupDropdownOpenChange(isOpened: boolean) {
    this.groupingDropdownOpened = isOpened;
  }

  handleDropdownClick(id: string) {
    if (this.selectedGroupsMap.has(id)) {
      this.selectedGroupsMap.set(id, !this.selectedGroupsMap.get(id));
      this.analysisGroupsVisibleChangedTrigger.emit();
    }
  }

  private analysisGroupsToDropdownOptions() {
    let groups = [...this._analysisGroups!.keys()];
    groups.sort();
    return groups.map((group: string) => {
      let label = group.replaceAll('-', ' ').replaceAll('_', ' ');
      let value = group;

      return {label: label, value: value} as DropdownOption<string>;
    });
  }

  private dropdownOptionsToMap(dropdownoptions: DropdownOption<string>[]) {
    return new Map(dropdownoptions.map((option) => [option.value, false]));
  }

  buttonClickChangeVisibility() {
    this.groupingLanesVisibilityTrigger.next(this.visibilityToToggle);
  }

  timelineConfiguratorPanelClick() {
    this.timelineConfiguratorPanelTrigger.emit();
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

  loopMarker() {
    const timeObservation = this.segmentationService.selectedMarker!.timeObservation as PeriodObservation;

    if (this._onTimeChangeBreaker$) {
      completeSub(this._onTimeChangeBreaker$);
    }
    this._onTimeChangeBreaker$ = new Subject();

    this.ompApiService.api!.video.pause();

    const frameRate = this.ompApiService.api!.video.getFrameRate();
    let startFrame = timeObservation.start! * frameRate;
    let stopFrame = timeObservation.end! * frameRate;

    this.ompApiService
      .api!.video.seekToFrame(startFrame)
      .pipe(first())
      .subscribe(() => {});

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
      } else if (event.frame <= startFrame - 1) {
        this.ompApiService.api!.video.pause().subscribe(() => {
          this.ompApiService
            .api!.video.seekToFrame(startFrame)
            .pipe(first())
            .subscribe(() => {});
        });

        completeSub(this._onTimeChangeBreaker$);
      }
    });

    this.segmentationService.onMarkerUpdate$.pipe(takeUntil(this._onTimeChangeBreaker$)).subscribe({
      next: (marker) => {
        const newTimeObservation = marker.timeObservation as PeriodObservation;
        startFrame = newTimeObservation.start! * frameRate;
        stopFrame = newTimeObservation.end! * frameRate;
      },
    });

    this.ompApiService.api!.timeline!.onTimecodeClick$.pipe(takeUntil(this._onTimeChangeBreaker$)).subscribe({
      next: (event) => {
        if (this.ompApiService.api!.video.parseTimecodeToFrame(event.timecode) < startFrame - 1 || this.ompApiService.api!.video.parseTimecodeToFrame(event.timecode) > stopFrame - 1) {
          completeSub(this._onTimeChangeBreaker$);
        }
      },
    });
  }

  hasIncompleteMarker() {
    if (this.activeTab === 'annotation') {
      return !!this.annotationService.incompleteMarker;
    } else {
      return !!this.segmentationService.incompleteMarker;
    }
  }

  addMarker() {
    if (this.hasIncompleteMarker()) {
      const timeObservation = {
        start: this.getCurrentModeService().incompleteMarker!.timeObservation.start,
        end: this.ompApiService.api!.video.getCurrentTime(),
      };
      this.getCurrentModeService().updatePeriodMarker(this.getCurrentModeService().incompleteMarker!.id, timeObservation);
    } else {
      const timeObservation = {
        start: this.ompApiService.api!.video.getCurrentTime(),
      };
      this.getCurrentModeService().addPeriodMarker(timeObservation);
    }
  }

  deleteMarker() {
    this.segmentationService.deleteMarker();
  }

  addPoint() {
    const timeObservation = {
      time: this.ompApiService.api!.video.getCurrentTime(),
    };
    this.getCurrentModeService().addMomentMarker(timeObservation);
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
        if (this.segmentationService.isAnnotationMarkerSelected()) {
          this.annotationService.updatePeriodMarker(selectedMarker.id, newTimeObservation);
        } else {
          this.segmentationService.updatePeriodMarker(selectedMarker.id, newTimeObservation);
        }
      } else if (this.isMomentObservation(oldTimeObservation)) {
        let newTimeObservation = {...oldTimeObservation, time: this.ompApiService.api?.video.getCurrentTime()!};
        if (this.segmentationService.isAnnotationMarkerSelected()) {
          this.annotationService.updateMomentMarker(selectedMarker.id, newTimeObservation);
        } else {
          this.segmentationService.updateMomentMarker(selectedMarker.id, newTimeObservation);
        }
      }
    }
  }

  setSelectedMarkerEndToCTI() {
    let selectedMarker = this.segmentationService.selectedMarker;
    if (selectedMarker) {
      let oldTimeObservation = selectedMarker.timeObservation as PeriodObservation | MomentObservation;

      if (this.isPeriodObservation(oldTimeObservation)) {
        let newTimeObservation = {...oldTimeObservation, end: this.ompApiService.api?.video.getCurrentTime()};
        if (this.segmentationService.isAnnotationMarkerSelected()) {
          this.annotationService.updatePeriodMarker(selectedMarker.id, newTimeObservation);
        } else {
          this.segmentationService.updatePeriodMarker(selectedMarker.id, newTimeObservation);
        }
      } else if (this.isMomentObservation(oldTimeObservation)) {
        let newTimeObservation = {...oldTimeObservation, time: this.ompApiService.api?.video.getCurrentTime()};
        if (this.segmentationService.isAnnotationMarkerSelected()) {
          this.annotationService.updateMomentMarker(selectedMarker.id, newTimeObservation);
        } else {
          this.segmentationService.updateMomentMarker(selectedMarker.id, newTimeObservation);
        }
      }
    }
  }

  getSegmentationColor(): string {
    if (this.activeTab === 'segmentation') {
      return this.segmentationColor;
    } else if (this.segmentationService.selectedMarker && this.segmentationService.markerLane?.id === this.segmentationTrack?.markerLaneId) {
      return this.segmentationColor;
    } else {
      return INACTIVE_SEGMENTATION_COLOR;
    }
  }

  setSegmentationColor(color: string) {
    if (!this.segmentationTrack) {
      return;
    }
    this.segmentationService.updateSegmentationTrackColor(this.segmentationTrack, color);
  }

  setAnnotationColor(color: string) {
    this.annotationService.annotationColor = color;
  }

  openColorPicker() {
    if (!this.isAnnotationColorPickerActive() && this.getSegmentationColor() === INACTIVE_SEGMENTATION_COLOR) {
      return;
    }
    // timeout is needed to prevent closing the color picker before it is opened
    setTimeout(() => {
      this.editingSegmentationColor = true;
    });
  }

  closeColorPicker() {
    this.editingSegmentationColor = false;
  }

  addSegmentationTrack() {
    this.segmentationService.createSegmentationTrack();
    this.layoutService.activeTab = 'segmentation';
  }

  isSegmentationActive() {
    return this.activeTab === 'segmentation' && this.segmentationTrack;
  }

  isAnnotationActive() {
    return this.activeTab === 'annotation';
  }

  isAnnotationColorPickerActive() {
    return this.segmentationService.isAnnotationMarkerSelected() || (this.isAnnotationActive() && !this.segmentationService.selectedMarker);
  }

  get canEndMarker(): boolean {
    const incompleteMarker = this.segmentationService.incompleteMarker ?? this.annotationService.incompleteMarker;
    if (!this.ompApiService.api || !incompleteMarker) {
      return false;
    }
    return this.ompApiService.api.video.getCurrentTime() >= incompleteMarker.timeObservation.start!;
  }

  get isMarkerSplitValid(): boolean {
    const selectedMarker = this.segmentationService.selectedMarker;

    if (!this.ompApiService.api?.video.isVideoLoaded()) {
      return false;
    }

    if (selectedMarker && this.isPeriodMarker(selectedMarker) && selectedMarker.timeObservation.end) {
      if (this.ompApiService.api.video.getVideoWindowPlaybackState() === 'attaching' || this.ompApiService.api.video.getVideoWindowPlaybackState() === 'detaching') {
        return false;
      }

      const startFrame = this.ompApiService.api.video.calculateTimeToFrame(selectedMarker.timeObservation.start!);
      const minimalEndTime = this.ompApiService.api.video.calculateFrameToTime(startFrame + 2);
      const CTITime = this.ompApiService.api.video.getCurrentTime();

      if (minimalEndTime < selectedMarker.timeObservation.end && CTITime > selectedMarker.timeObservation.start! && CTITime < selectedMarker.timeObservation.end) {
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

  private getCurrentModeService(): AnnotationService | SegmentationService {
    if (this.activeTab === 'annotation') {
      return this.annotationService;
    } else {
      return this.segmentationService;
    }
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

  get isVisible(): boolean {
    return this._visible;
  }

  get isDisabled(): boolean {
    return this._disabled;
  }

  get isVideoLoaded(): boolean {
    return !this.ompApiService.api || (this.ompApiService.api && !this.ompApiService.api!.video.isVideoLoaded());
  }

  get numberOfSelected() {
    return [...this.selectedGroupsMap.values()].reduce<number>((previousValue, currentValue) => {
      if (currentValue) {
        previousValue++;
      }
      return previousValue;
    }, 0);
  }

  get playLastNSecondsEnabled(): boolean {
    if (this._videoLoadedEvent) {
      return !!this._videoTimeChangeEvent && this._videoTimeChangeEvent.frame > 10;
    } else {
      return false;
    }
  }

  get playNextNSecondsEnabled(): boolean {
    if (this._videoLoadedEvent) {
      return !this._videoTimeChangeEvent || this.ompApiService.api!.video.getTotalFrames() - this._videoTimeChangeEvent.frame > 10;
    } else {
      return false;
    }
  }

  get isLoopEnabled(): boolean {
    let selectedMarker = this.segmentationService.selectedMarker;

    if (selectedMarker) {
      const timeObservation = selectedMarker.timeObservation as PeriodObservation | MomentObservation;
      if (this.isPeriodObservation(timeObservation) && timeObservation.start != undefined && timeObservation.end != undefined) {
        return true;
      }
    }
    return false;
  }

  get iconName(): IconName {
    return this.visibilityToToggle === 'maximized' ? 'double-chevron-up' : 'double-chevron-down';
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    const targetElement = event.target as HTMLElement;
    const formInputs = ['INPUT', 'TEXTAREA', 'OMAKASE-MARKER-LIST'];
    if (formInputs.includes(targetElement.tagName.toUpperCase())) {
      if (!targetElement.classList.contains('omakase-timecode-edit-input') || event.key !== "'") {
        return;
      }
    }

    if (this.activeTab === 'segmentation' || this.activeTab === 'annotation') {
      // Mark In / Out - m
      if (event.code === 'KeyM') {
        if (!this.ompApiService.api || !this.ompApiService.api.video.isVideoLoaded()) {
          return;
        }

        if (!this.hasIncompleteMarker() || this.canEndMarker) {
          this.addMarker();
        }
      }

      // Add Point - ,
      if (event.key === ',') {
        if (!this.ompApiService.api || !this.ompApiService.api.video.isVideoLoaded()) {
          return;
        }

        this.addPoint();
      }

      // Toggle Previous / Next Marker - / | Shift + /
      if (event.code === 'Slash') {
        const markerList = this.segmentationService.isAnnotationMarkerSelected() ? this.annotationService.annotationLane! : this.segmentationService.markerList!;
        const markers = markerList.getMarkers();
        if (!markers.length) {
          return;
        }
        let nextOrPrevious = event.shiftKey ? 1 : -1;

        const newActiveMarkerIndex = markerList.getSelectedMarker() ? markers.indexOf(markerList.getSelectedMarker()! as Marker) + nextOrPrevious : 0;
        let newActiveMarker;

        if (newActiveMarkerIndex < 0) {
          newActiveMarker = markers.at(-1);
        } else if (newActiveMarkerIndex >= markers.length) {
          newActiveMarker = markers.at(0);
        } else {
          newActiveMarker = markers.at(newActiveMarkerIndex);
        }

        this.segmentationService.selectMarker(newActiveMarker as Marker);
      }
    }

    if (this.segmentationService.selectedMarker) {
      const activeMarker = this.segmentationService.selectedMarker;

      // Set Playhead to Start of Active Marker
      if (event.key === '[') {
        this.moveCTIToMarker('start');
      }

      // Set Playhead to End of Active Marker
      if (event.key === ']') {
        this.moveCTIToMarker('end');
      }

      // Split Active Marker - .
      if (event.key === '.') {
        this.splitMarker();
      }

      // Delete Active Marker - n
      if (event.code === 'KeyN') {
        this.deleteMarker();
      }

      // Set Start of Active Marker to Playhead Position
      if (event.code === 'KeyI') {
        if (this.isMomentMarker(activeMarker!)) {
          const timeObservation = {
            time: this.ompApiService.api!.video.getCurrentTime(),
          };
          if (this.segmentationService.isAnnotationMarkerSelected()) {
            this.annotationService.updateMomentMarker(activeMarker.id, timeObservation);
          } else {
            this.segmentationService.updateMomentMarker(activeMarker.id, timeObservation);
          }
        } else if (this.isPeriodMarker(activeMarker!)) {
          const timeObservation = {
            start:
              activeMarker.timeObservation.end && this.ompApiService.api!.video.getCurrentTime() > activeMarker.timeObservation.end
                ? activeMarker.timeObservation.end
                : this.ompApiService.api!.video.getCurrentTime(),
            end: activeMarker.timeObservation.end,
          };
          if (this.segmentationService.isAnnotationMarkerSelected()) {
            this.annotationService.updatePeriodMarker(activeMarker.id, timeObservation);
          } else {
            this.segmentationService.updatePeriodMarker(activeMarker.id, timeObservation);
          }
        }
      }

      // Set End of Active Marker to Playhead Position
      if (event.code === 'KeyO') {
        if (this.isMomentMarker(activeMarker!)) {
          const timeObservation = {
            time: this.ompApiService.api!.video.getCurrentTime(),
          };
          if (this.segmentationService.isAnnotationMarkerSelected()) {
            this.annotationService.updateMomentMarker(activeMarker.id, timeObservation);
          } else {
            this.segmentationService.updateMomentMarker(activeMarker.id, timeObservation);
          }
        } else if (this.isPeriodMarker(activeMarker!)) {
          const timeObservation = {
            start: activeMarker.timeObservation.start,
            end: this.ompApiService.api!.video.getCurrentTime() < activeMarker.timeObservation.start! ? activeMarker.timeObservation.start : this.ompApiService.api!.video.getCurrentTime(),
          };
          if (this.segmentationService.isAnnotationMarkerSelected()) {
            this.annotationService.updatePeriodMarker(activeMarker.id, timeObservation);
          } else {
            this.segmentationService.updatePeriodMarker(activeMarker.id, timeObservation);
          }
        }
      }
    }

    // Loop on Active Marker
    if (event.code === 'KeyP' && this.isLoopEnabled) {
      this.loopMarker();
    }

    // Rewind 3 Seconds and Play to Current Playhead | Play 3 Seconds and Rewind to Current Playhead
    if (['ArrowLeft', 'ArrowRight'].includes(event.key) && event.metaKey) {
      event.preventDefault();
      let rewindOrPlay = event.key === 'ArrowRight' ? 1 : 0;
      if (rewindOrPlay) {
        if (this.playNextNSecondsEnabled) {
          this.playNextNSeconds(3);
        }
      } else {
        if (this.playLastNSecondsEnabled) {
          this.playLastNSeconds(3);
        }
      }
    }

    // Toggle interactive CTI
    if (event.key === "'") {
      if (!this.ompApiService.api || !this.ompApiService.api.timeline) {
        return;
      }

      this.ompApiService.api.timeline.toggleTimecodeEdit();
    }
  }
}
