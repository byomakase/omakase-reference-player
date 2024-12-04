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

import {Component, ElementRef, HostBinding, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {Store} from '@ngxs/store';
import {SegmentationState, SegmentationTrack} from './segmentation.state';
import {Observable, Subject, takeUntil} from 'rxjs';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import {Marker, MarkerLane} from '@byomakase/omakase-player';
import {SegmentationService} from '../segmentation-list/segmentation.service';
import {TimelineService} from '../../timeline/timeline.service';
import {ModalService} from '../../../shared/components/modal/modal.service';
import {EditModalComponent} from '../../../shared/components/edit-modal/edit-modal.component';
import {ConfirmationModalComponent} from '../../../shared/components/modal/confirmation-modal.component';

@Component({
  selector: 'div[appSegmentation]',
  standalone: true,
  imports: [CoreModule, SharedModule],
  template: `<div class="segmentation-wrapper">
    @if (!(activeTrack$ | async)) {
      <div>No segmentation tracks defined</div>
    }
    <div id="segmentation-marker-list" class="h-100"></div>
    <div #segmentationToggle class="segmentation-menu-trigger" (click)="toggleSegmentationMenu()"></div>
    <div #segmentationMenu class="segmentation-menu" [ngClass]="{'d-none': !openSegmentationMenu}">
      <div class="segmentation-menu-item" (click)="openDeleteModal()">DELETE</div>
      <!-- <div class="segmentation-menu-item">EXPORT CSV</div>
      <div class="segmentation-menu-item">EXPORT JSON</div> -->
    </div>
    <template id="segmentation-marker-list-header">
      <div class="flex-row">
        <div class="header-cell" style="width:125px"></div>
        <div class="header-cell" style="flex-grow:1">NAME</div>
        <div class="header-cell flex-hide" style="width:120px;min-width:15%">IN</div>
        <div class="header-cell flex-hide" style="width:120px;min-width:15%">OUT</div>
        <div class="header-cell flex-hide" style="width:120px;min-width:15%">DURATION</div>
        <div class="header-cell" style="width:60px"></div>
      </div>
    </template>
    <template id="segmentation-marker-list-row">
      <div class="flex-row bordered">
        <div class="flex-cell">
          <span slot="color" style="display:inline-block;height:53px;width:5px"></span>
        </div>
        <div class="flex-cell" style="width: 120px">
          <img slot="thumbnail" height="55" />
        </div>
        <div class="flex-cell" style="flex-grow:1" slot="name"></div>
        <div class="flex-cell flex-hide" style="width:120px;min-width:15%" slot="start"></div>
        <div class="flex-cell flex-hide" style="width:120px;min-width:15%" slot="end"></div>
        <div class="flex-cell flex-hide" style="width:120px;min-width:15%" slot="duration"></div>
        <div class="flex-cell flex-cell-buttons" style="width:60px;text-align:center">
          <span class="icon-edit" slot="action-edit"></span>
          <span class="icon-delete" slot="remove"></span>
        </div>
      </div>
    </template>
  </div>`,
})
export class SegmentationComponent implements OnInit, OnDestroy {
  public openSegmentationMenu = false;

  @ViewChild('segmentationToggle') segmentationToggleElement!: ElementRef;
  @ViewChild('segmentationMenu') segmentationMenuElement!: ElementRef;

  private _destroyed$ = new Subject<void>();
  activeTrack$: Observable<SegmentationTrack | undefined>;

  constructor(
    protected store: Store,
    protected ompApiService: OmpApiService,
    protected segmentationService: SegmentationService,
    protected timelineService: TimelineService,
    protected modalService: ModalService
  ) {
    this.activeTrack$ = store.select(SegmentationState.activeTrack);
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'segmentation-content';
  }

  ngOnInit() {
    this.store
      .select(SegmentationState.activeTrack)
      .pipe(takeUntil(this._destroyed$))
      .subscribe({
        next: (activeTrack) => {
          if (this.segmentationService.markerList) {
            this.segmentationService.unselectActiveMarker();
            this.segmentationService.markerList.destroy();
          }
          if (activeTrack) {
            this.ompApiService
              .api!.createMarkerList({
                markerListHTMLElementId: 'segmentation-marker-list',
                templateHTMLElementId: 'segmentation-marker-list-row',
                headerHTMLElementId: 'segmentation-marker-list-header',
                styleUrl: './assets/css/segmentation.css',
                source: this.timelineService.getTimelineLaneById(activeTrack.markerLaneId) as MarkerLane,
                thumbnailVttFile: this.timelineService.getThumbnailLane()?.vttFile,
              })
              .subscribe({
                next: (markerList) => {
                  this.segmentationService.markerList = markerList;
                  this.segmentationService.markerList.onMarkerClick$.pipe(takeUntil(this._destroyed$)).subscribe(({marker}) => this.segmentationService.toggleMarker(marker as Marker));
                  this.segmentationService.markerList.onMarkerSelected$.pipe(takeUntil(this._destroyed$)).subscribe(({marker}) => (this.segmentationService.selectedMarker = marker));
                  this.segmentationService.markerList.onMarkerAction$.pipe(takeUntil(this._destroyed$)).subscribe({
                    next: ({marker, action}) => {
                      if (action === 'edit' && marker === this.segmentationService.markerList!.getSelectedMarker()) {
                        this.openEditModal();
                      }
                    },
                  });
                },
              });
          }
        },
      });
  }

  ngOnDestroy() {
    this.segmentationService.unselectActiveMarker();
    this._destroyed$.next();
  }

  deleteActiveSegmentationTrack() {
    this.segmentationService.deleteActiveSegmentationTrack();
  }

  openDeleteModal() {
    const activeTrack = this.store.selectSnapshot(SegmentationState.activeTrack);
    if (!activeTrack || this.segmentationService.incompleteMarker) {
      return;
    }
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef!.componentInstance.confirmationMessage = `Delete the Segmentation ${activeTrack.name}?`;
    modalRef!.componentInstance.onOk$.subscribe(() => this.deleteActiveSegmentationTrack());
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement: HTMLElement): void {
    if (this.openSegmentationMenu) {
      const clickedInside = this.segmentationMenuElement.nativeElement.contains(targetElement) || this.segmentationToggleElement.nativeElement.contains(targetElement);
      if (!clickedInside) {
        console.log('close');
        this.openSegmentationMenu = false;
      }
    }
  }

  toggleSegmentationMenu() {
    this.openSegmentationMenu = !this.openSegmentationMenu;
  }

  private openEditModal() {
    const modalRef = this.modalService.open(EditModalComponent);

    if (!modalRef) {
      return;
    }

    let selectedMarker = this.segmentationService.markerList!.getSelectedMarker()!;
    modalRef.componentInstance.markerName = selectedMarker.name;
    modalRef.componentInstance.onUpdate.subscribe((value: string) => {
      this.segmentationService.markerList!.updateMarker(selectedMarker.id, {name: value});
    });
  }
}
