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

import {Component, HostBinding, HostListener, OnDestroy, OnInit} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {Select, Store} from '@ngxs/store';
import {SegmentationState, SegmentationTrack} from '../segmentation/segmentation.state';
import {Observable, Subject} from 'rxjs';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import {SegmentationService} from './segmentation.service';
import {InlineEditComponent} from '../../../shared/components/inline-edit/inline-edit.component';

@Component({
    selector: 'div[appSegmentationList]',
    imports: [CoreModule, SharedModule, InlineEditComponent],
    template: ` <div class="segmentation-list-container d-flex flex-row">
    @for (track of tracks$ | async; track track.id) {
      <div class="segmentation-list-item d-flex flex-row" [ngClass]="{active: track === (activeTrack$ | async), initial: isInInitialTracks(track)}">
        <app-inline-edit [displayText]="track.name" [close$]="closeSegmentationNameEdit$" (clicked)="setActiveTrack(track)" (edited)="editTrack(track, $event)"></app-inline-edit>
      </div>
    }
  </div>`
})
export class SegmentationListComponent implements OnInit, OnDestroy {
  @Select(SegmentationState.tracks) tracks$!: Observable<SegmentationTrack[]>;
  @Select(SegmentationState.activeTrack) activeTrack$!: Observable<SegmentationTrack>;

  public editingSegmentationName?: SegmentationTrack;
  public closeSegmentationNameEdit$ = new Subject<boolean>();

  private _destroyed$ = new Subject<void>();
  private _initialTracks?: SegmentationTrack[];

  constructor(
    protected store: Store,
    protected ompApiService: OmpApiService,
    protected segmentationService: SegmentationService
  ) {}

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'segmentation-list';
  }

  @HostListener('document:click', ['$event.target'])
  public replyClickHandler(targetElement: HTMLElement): void {
    if (!targetElement.classList.contains('inline-edit-text')) {
      this.closeSegmentationNameEdit$.next(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (event.code === 'Enter') {
      this.closeSegmentationNameEdit$.next(true);
    } else if (event.code === 'Escape') {
      this.closeSegmentationNameEdit$.next(false);
    }
  }

  ngOnInit() {
    this.segmentationService.initSegmentationMode();
    this._initialTracks = this.store.selectSnapshot(SegmentationState.tracks);
  }

  ngOnDestroy() {
    this._destroyed$.next();
  }

  editTrack(track: SegmentationTrack, name: string) {
    this.segmentationService.updateSegmentationTrackName(track, name);
  }

  setActiveTrack(track: SegmentationTrack) {
    this.segmentationService.setActiveTrack(track);
  }

  isInInitialTracks(track: SegmentationTrack) {
    return this._initialTracks?.find((t) => t.id === track.id);
  }
}
