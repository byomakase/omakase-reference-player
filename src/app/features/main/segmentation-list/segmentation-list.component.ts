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

import {Component, HostBinding, OnDestroy, OnInit} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {Select, Store} from '@ngxs/store';
import {SegmentationState, SegmentationTrack} from '../segmentation/segmentation.state';
import {Observable, Subject} from 'rxjs';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import {SegmentationService} from './segmentation.service';
import {ColorPickerComponent} from '../../../shared/components/color-picker/color-picker.component';
import {Constants} from '../../../shared/constants/constants';
import {InlineEditComponent} from '../../../shared/components/inline-edit/inline-edit.component';

@Component({
  selector: 'div[appSegmentationList]',
  standalone: true,
  imports: [CoreModule, SharedModule, ColorPickerComponent, InlineEditComponent],
  template: ` <div class="segmentation-list-container d-flex flex-row">
    @for (track of tracks$ | async; track track.id) {
      <div class="segmentation-list-item d-flex flex-row" [ngClass]="{active: track === (activeTrack$ | async)}">
        <div class="segmentation-list-item-color" [ngStyle]="{'background-color': track.color}" (click)="openColorPicker(track)"></div>
        <app-inline-edit [displayText]="track.name" (clicked)="setActiveTrack(track)" (edited)="editTrack(track, $event)"></app-inline-edit>
        @if (editingSegmentationColor == track) {
          <app-color-picker [colors]="segmentationColors" [activeColor]="track.color" (selectedColor)="setSegmentationColor(track, $event)" (clickOutside)="closeColorPicker()"></app-color-picker>
        }
      </div>
    }
    <div class="segmentation-list-item" (click)="addTrack()">
      <i appIcon="add" title="Create segmentation track"></i>
    </div>
  </div>`,
})
export class SegmentationListComponent implements OnInit, OnDestroy {
  @Select(SegmentationState.tracks) tracks$!: Observable<SegmentationTrack[]>;
  @Select(SegmentationState.activeTrack) activeTrack$!: Observable<SegmentationTrack>;

  public editingSegmentationColor?: SegmentationTrack;
  public editingSegmentationName?: SegmentationTrack;
  public segmentationColors = Constants.VARIABLES.segmentationColors;

  private _destroyed$ = new Subject<void>();
  private _clickedSegmentationTrack?: SegmentationTrack;

  constructor(
    protected store: Store,
    protected ompApiService: OmpApiService,
    protected segmentationService: SegmentationService
  ) {}

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'segmentation-list';
  }

  ngOnInit() {
    this.segmentationService.initSegmentationMode();
  }

  ngOnDestroy() {
    this._destroyed$.next();
  }

  addTrack() {
    this.segmentationService.createSegmentationTrack();
  }

  editTrack(track: SegmentationTrack, name: string) {
    this.segmentationService.updateSegmentationTrackName(track, name);
  }

  setActiveTrack(track: SegmentationTrack) {
    this.segmentationService.setActiveTrack(track);
  }

  setSegmentationColor(track: SegmentationTrack, color: string) {
    this.segmentationService.updateSegmentationTrackColor(track, color);
  }

  openColorPicker(track: SegmentationTrack) {
    // timeout is needed to prevent closing the color picker before it is opened
    setTimeout(() => {
      this.editingSegmentationColor = track;
    });
  }

  closeColorPicker() {
    this.editingSegmentationColor = undefined;
  }
}
