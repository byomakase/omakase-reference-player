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

import {Component, ElementRef, HostBinding, HostListener, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {Store} from '@ngxs/store';
import {SegmentationState, SegmentationTrack} from './segmentation.state';
import {Observable, Subject, takeUntil} from 'rxjs';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import {SegmentationService} from '../segmentation-list/segmentation.service';
import {TimelineService} from '../../timeline/timeline.service';
import {ModalService} from '../../../shared/components/modal/modal.service';
import {ConfirmationModalComponent} from '../../../shared/components/modal/confirmation-modal.component';
import {SegmentationAction} from '../../../model/domain.model';
import {DownloadService} from '../../../shared/services/download.service';
import {MarkerListItem} from '@byomakase/omakase-player';
import {ToastService} from '../../../shared/components/toast/toast.service';
import {IconModule} from '../../../shared/components/icon/icon.module';

interface MarkerExportItem {
  name?: string;
  start: string;
  end?: string;
}

@Component({
  selector: 'div[appSegmentation]',
  standalone: true,
  imports: [CoreModule, SharedModule, IconModule],
  template: ` <div class="segmentation-wrapper">
    @if (!(activeTrack$ | async)) {
      <div>No segmentation tracks defined</div>
    }
    <div id="segmentation-marker-list" class="h-100"></div>
    <div #segmentationToggle class="segmentation-menu-trigger" [class.disabled]="!(activeTrack$ | async)" (click)="toggleSegmentationMenu()">
      <i appIcon="menu"></i>
    </div>
    <div #segmentationMenu class="segmentation-menu" [ngClass]="{'d-none': !openSegmentationMenu}">
      <div class="segmentation-menu-item" (click)="openDeleteModal()">DELETE</div>
      @if (this.isExportVisible()) {
        <div class="segmentation-menu-item" (click)="downloadMarkersAsCsv()">EXPORT CSV</div>
        <div class="segmentation-menu-item" (click)="downloadMArkersAsJson()">EXPORT JSON</div>
        @if (segmentationActions) {
          @for (action of segmentationActions; track action.name) {
            @if (action.name) {
              <div class="segmentation-menu-item" (click)="triggerSegmentationAction(action)">{{ getSegmentationActionName(action, true) }}</div>
            }
          }
        }
      }
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

  @Input() segmentationActions?: SegmentationAction[];

  private _destroyed$ = new Subject<void>();
  private _lastActiveTrack?: SegmentationTrack;
  activeTrack$: Observable<SegmentationTrack | undefined>;

  constructor(
    protected store: Store,
    protected ompApiService: OmpApiService,
    protected segmentationService: SegmentationService,
    protected timelineService: TimelineService,
    protected modalService: ModalService,
    protected downloadService: DownloadService,
    protected toastService: ToastService
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
          if (activeTrack?.id === this._lastActiveTrack?.id && activeTrack?.color === this._lastActiveTrack?.color) {
            return;
          }
          this._lastActiveTrack = activeTrack;
          if (this.segmentationService.markerList) {
            this.segmentationService.unselectActiveMarker();
            this.segmentationService.markerList.destroy();
          }
          if (activeTrack) {
            this.segmentationService.createMarkerList(activeTrack, this._destroyed$);
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
    this.openSegmentationMenu = false;
  }

  isExportVisible() {
    return this.segmentationService.markerList?.getMarkers().length !== 0;
  }

  downloadMarkersAsCsv() {
    const markers = this.segmentationService.markerList?.getMarkers()! as MarkerListItem[];
    const markersAsLists = markers.map((marker: MarkerListItem) => {
      const row = [marker.name ?? '', '', '', ''];
      row[1] = this.ompApiService.api!.video.formatToTimecode(marker.start!);

      if (marker.end) {
        row[2] = this.ompApiService.api!.video.formatToTimecode(marker.end!);
        const startFrame = this.ompApiService.api!.video.calculateTimeToFrame(marker.start!);
        const endFrame = this.ompApiService.api!.video.calculateTimeToFrame(marker.end);
        row[3] = this.ompApiService.api!.video.calculateFrameToTime(endFrame - startFrame).toFixed(2);
      }

      const escapedRow = row.map((elem) => `\"${elem}\"`);
      return escapedRow;
    });

    markersAsLists.unshift(['Name', 'Start', 'End', 'Duration']);

    const markersAsCsv = markersAsLists.map((row) => row.join(',')).join('\n');
    const activeTrack = this.store.selectSnapshot(SegmentationState.activeTrack);

    this.downloadService.downloadText(markersAsCsv, `${activeTrack!.name.replaceAll(' ', '-')}.csv`);
  }

  downloadMArkersAsJson() {
    const markers = this.segmentationService.markerList?.getMarkers()! as MarkerListItem[];
    const markersAsObjects = markers.map((marker: MarkerListItem) => {
      const obj = {} as MarkerExportItem;
      obj.name = marker.name;

      obj.start = this.ompApiService.api!.video.formatToTimecode(marker.start!);
      if (marker.end) {
        obj.end = this.ompApiService.api!.video.formatToTimecode(marker.end!);
      }

      return obj;
    });
    const activeTrack = this.store.selectSnapshot(SegmentationState.activeTrack);
    const jsonFile = JSON.stringify(
      {
        name: activeTrack!.name,
        markers: markersAsObjects,
      },
      null,
      2
    );

    this.downloadService.downloadText(jsonFile, `${activeTrack!.name.replaceAll(' ', '-')}.json`);
  }

  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement: HTMLElement): void {
    if (this.openSegmentationMenu) {
      const clickedInside = this.segmentationMenuElement.nativeElement.contains(targetElement) || this.segmentationToggleElement.nativeElement.contains(targetElement);
      if (!clickedInside) {
        this.openSegmentationMenu = false;
      }
    }
  }

  toggleSegmentationMenu() {
    if (!this.store.selectSnapshot(SegmentationState.activeTrack)) {
      return;
    }
    this.openSegmentationMenu = !this.openSegmentationMenu;
  }

  getSegmentationActionName(action: SegmentationAction, uppercase = false) {
    const name = action.name.replaceAll('_', ' ').replaceAll('-', ' ');
    return uppercase ? name.toUpperCase() : name;
  }

  triggerSegmentationAction(action: SegmentationAction) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef!.componentInstance.confirmationMessage = `Proceed with ${this.getSegmentationActionName(action)}?`;
    modalRef!.componentInstance.confirmText = 'Proceeed';
    modalRef!.componentInstance.onOk$.subscribe(() => {
      this.toastService.show({type: 'success', message: 'Action initiated successfully', duration: 3000});
    });
    this.openSegmentationMenu = false;
  }
}
