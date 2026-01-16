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

import {AfterViewInit, Component, ElementRef, HostBinding, inject, ViewChild} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {BaseOffcanvas} from '../../../shared/components/offcanvas/base-offcanvas';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';

import {IconModule} from '../../../shared/components/icon/icon.module';
import {AnnotationCreateComponent} from '../annotation-create/annotation-create.component';
import {AnnotationListComponent} from '../annotation-list/annotation-list.component';
import {AnnotationService} from '../annotation/annotation.service';
import {timecodeSortingStrategy, createdSortingStrategy, AnnotationSortingStrategy} from '../annotation-list/annotation-list.sorting';

type AnnotationSortingStrategyEntry = {
  name: AnnotationSortingName;
  sortingStrategy: AnnotationSortingStrategy;
};

type AnnotationSortingName = 'Timecode' | 'Created';

@Component({
    selector: 'div[appAnnotationOffcanvas]',
    imports: [CoreModule, SharedModule, IconModule, AnnotationListComponent, AnnotationCreateComponent],
    template: `
    <div class="annotation-wrapper d-flex flex-column h-100">
      <div class="annotation-flyout-header">
        <span>NOTES</span>
        <i class="close-icon" appIcon="close" (click)="close()"></i>
      </div>
      @if (annotationService.isInitialized) {
        <div class="annotation-header" style="opacity:1">
          <div class="search-bar">
            <i class="" appIcon="search"></i>
            <input #searchInput id="annotation-filter-input" type="text" (keyup)="handleAnnotationFilterKeyUp()" placeholder="Search" />
          </div>
          <div class="icon-container">
            <div ngbDropdown class="d-inline-block">
              <i class="" appIcon="sort" ngbDropdownToggle></i>

              <div ngbDropdownMenu aria-labelledby="dropdownMenu">
                @for (sortingStrategyEntry of annotationSortingStrategyEntries; track sortingStrategyEntry.name) {
                  <div
                    [ngClass]="selectedSortingStrategy === sortingStrategyEntry.name ? 'selected' : ''"
                    [id]="'sorting-' + sortingStrategyEntry.name"
                    ngbDropdownItem
                    (click)="handleSortingClick(sortingStrategyEntry)"
                  >
                    {{ sortingStrategyEntry.name }}
                  </div>
                }
              </div>
            </div>
            @if (areAnnotationsExpaned) {
              <i appIcon="circle-chevron-up" (click)="toggleCollapse()"></i>
            } @else {
              <i appIcon="circle-chevron-down" (click)="toggleCollapse()"></i>
            }
          </div>
        </div>
        <div class="annotation-list-wrapper flex-grow-1">
          <div appAnnotationList [isThreadingSupported]="isThreadingSupported"></div>
        </div>
        <div class="annotation-create-wrapper">
          <div appAnnotationCreate></div>
        </div>
      }
    </div>
  `
})
export class AnnotationOffcanvasComponent extends BaseOffcanvas implements AfterViewInit {
  public isThreadingSupported = true;
  public annotationService = inject(AnnotationService);
  public annotationSortingStrategyEntries: AnnotationSortingStrategyEntry[] = [
    {name: 'Timecode', sortingStrategy: timecodeSortingStrategy},
    {name: 'Created', sortingStrategy: createdSortingStrategy},
  ];
  public selectedSortingStrategy: string = 'Timecode';
  public areAnnotationsExpaned: boolean = true;

  @ViewChild(AnnotationListComponent) annotationList!: AnnotationListComponent;
  @ViewChild('searchInput') searchInput!: ElementRef;

  constructor(activeOffcanvas: NgbActiveOffcanvas) {
    super(activeOffcanvas);
  }

  ngAfterViewInit(): void {
    const annotationSortingStrategyEntry = this.annotationSortingStrategyEntries.at(0)!;

    this.handleSortingClick(annotationSortingStrategyEntry);
  }

  public handleSortingClick(annotationSortingStrategy: AnnotationSortingStrategyEntry) {
    this.selectedSortingStrategy = annotationSortingStrategy.name;
    this.annotationList.sortingStrategy = annotationSortingStrategy.sortingStrategy;
  }

  handleAnnotationFilterKeyUp() {
    this.annotationList.filterToken = this.searchInput.nativeElement.value;
  }

  public close() {
    this.activeOffcanvas.close();
  }

  public toggleCollapse() {
    if (this.areAnnotationsExpaned) {
      this.annotationList.changeCollapsedState(true);
      this.areAnnotationsExpaned = false;
    } else {
      this.annotationList.changeCollapsedState(false);
      this.areAnnotationsExpaned = true;
    }
  }

  public forceCollapsedState() {
    if (this.areAnnotationsExpaned === true) {
      this.annotationList.changeCollapsedState(false);
    } else {
      this.annotationList.changeCollapsedState(true);
    }
  }

  @HostBinding('class')
  get hostElementClass(): string | undefined {
    return 'annotation-offcanvas';
  }
}
