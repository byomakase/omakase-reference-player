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

import {ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, ViewChild} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {InfoTab, SessionData, SourceInfo} from '../../../model/domain.model';
import {MetadataOffcanvasService} from '../metadata-offcanvas/metadata-offcanvas.service';
import {BehaviorSubject} from 'rxjs';
import {StringUtil} from '../../../util/string-util';

interface ScrollPosition {
  top: number,
  left: number
}

@Component({
  selector: 'div[appMetadataExplorer]',
  standalone: true,
  imports: [
    CoreModule,
    SharedModule
  ],
  template: `
    <div id="metadata-nav" class="align-items-end" [class.d-none]="!(showInfo$|async)">
      <ul ngbNav #nav="ngbNav" class="nav-pills h-100" (activeIdChange)="onNavChange($event)" [destroyOnHide]="false" [animation]="false">
        <li [ngbNavItem]="'sources'">
          <button ngbNavLink>Sources</button>
          <ng-template ngbNavContent>
            @if (showSources$|async) {
              @for (source_info of sessionDataFiltered!.data?.source_info; track source_info; let index = $index) {
                <div ngbAccordion class="mb-2">
                  <div ngbAccordionItem #accordionItem="ngbAccordionItem">
                    <div ngbAccordionHeader class="accordion-button custom-header justify-content-between">
                      <button type="button" class="btn btn-link btn-source-info-name container-fluid text-start text-truncate" ngbAccordionToggle>
                        <i [appIcon]="accordionItem.collapsed ? 'chevron-right' : 'chevron-down'"></i> {{ sessionData?.data!.source_info[index].name }}
                      </button>
                      @if (hasMediaInfo(sessionData?.data!.source_info[index])) {
                        <button type="button" class="btn btn-link btn-metadata d-none d-lg-block text-nowrap" (click)="openMetadata(sessionData?.data!.source_info[index])">
                          Metadata <i class="ms-1" appIcon="code"></i>
                        </button>
                      }
                    </div>
                    <div ngbAccordionCollapse>
                      <div ngbAccordionBody>
                        <ngx-json-viewer [json]="source_info"></ngx-json-viewer>
                      </div>
                    </div>
                  </div>
                </div>
              }
            }
          </ng-template>
        </li>
        @if (showInfo$|async) {
          @for (info_tab of sessionDataFiltered!.data!.presentation.info_tabs; track info_tab; let index = $index) {
            @if (info_tab.type === 'json' && info_tab.visualization === 'json_tree') {
              <li [ngbNavItem]="'info-tab-'+index">
                <button ngbNavLink>{{ resolveInfoTabName(info_tab, index) }}</button>
                <ng-template ngbNavContent>
                  <div class="w-100 h-100">
                    <ngx-json-viewer #ngxJsonViewer [json]="info_tab.data" [expanded]="true"></ngx-json-viewer>
                  </div>
                </ng-template>
              </li>
            }
          }
        }
      </ul>
    </div>
    <div id="metadata-content" #metadataContent (scroll)="onMetadataContentScroll($event)">
      <div [ngbNavOutlet]="nav">

      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetadataExplorerComponent {
  @ViewChild('metadataContent') metadataContentElementRef!: ElementRef;

  showSources$ = new BehaviorSubject<boolean>(false);
  showInfo$ = new BehaviorSubject<boolean>(false);

  sessionDataFiltered?: Partial<SessionData>;

  private _sessionData?: SessionData;

  private navActiveId: string | undefined;
  private navIdScrollPositionMap: Record<string, ScrollPosition> = {};

  constructor(private metadataOffcanvasService: MetadataOffcanvasService,) {
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'metadata-explorer';
  }

  @Input()
  set sessionData(value: SessionData | undefined) {
    this._sessionData = value;

    this.sessionDataFiltered = {
      ...JSON.parse(JSON.stringify(this._sessionData)), // we dont want to alter root object
    } as Partial<SessionData>;

    this.sessionDataFiltered.data?.source_info.forEach(sourceInfo => {
      // @ts-ignore
      delete sourceInfo['id'];
      // @ts-ignore
      delete sourceInfo['name'];
    })

    if (this._sessionData?.data.source_info) {
      this.showSources$.next(true);
    }

    if (this._sessionData?.data.presentation.info_tabs && this._sessionData?.data.presentation.info_tabs.length > 0) {
      this.showInfo$.next(true);
    }
  }

  get sessionData(): SessionData | undefined {
    return this._sessionData;
  }

  resolveInfoTabName(infoTab: InfoTab, index: number): string {
    return !StringUtil.isNullUndefinedOrWhitespace(infoTab.name) ? infoTab.name : `Info ${index + 1}`;
  }

  onNavChange(activeId: string) {
    this.navActiveId = activeId;
    // scroll to previously saved position
    if (this.metadataContentElementRef) {
      if (this.navIdScrollPositionMap[this.navActiveId]) {
        let scrollPosition = this.navIdScrollPositionMap[this.navActiveId];
        this.metadataContentElementRef.nativeElement.scrollTop = scrollPosition.top;
        this.metadataContentElementRef.nativeElement.scrollLeft = scrollPosition.left;
      } else {
        this.metadataContentElementRef.nativeElement.scrollLeft = 0;
        this.metadataContentElementRef.nativeElement.scrollTop = 0;
      }
    }
  }

  onMetadataContentScroll(event: any) {
    if (this.navActiveId && this.metadataContentElementRef) {
      // save scroll position
      this.navIdScrollPositionMap[this.navActiveId] = {
        top: this.metadataContentElementRef.nativeElement.scrollTop,
        left: this.metadataContentElementRef.nativeElement.scrollLeft
      }
    }
  }

  hasMediaInfo(sourceInfo: SourceInfo): boolean {
    return !!this._sessionData && !!this._sessionData.data.media_info.find(p => p.source_id === sourceInfo.id);
  }

  openMetadata(sourceInfo: SourceInfo) {
    let mediaInfo = this._sessionData?.data.media_info.find(p => p.source_id === sourceInfo.id);
    if (mediaInfo) {
      this.metadataOffcanvasService.open(sourceInfo, mediaInfo);
    }
  }

}
