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

import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, ViewChild} from '@angular/core';
import {MediaInfo, SourceInfo} from '../../../model/domain.model';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {BaseOffcanvas} from '../../../shared/components/offcanvas/base-offcanvas';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {NgxJsonViewerComponent} from 'ngx-json-viewer';

@Component({
  selector: 'div[appMetadataOffcanvas]',
  standalone: true,
  imports: [
    CoreModule,
    SharedModule
  ],
  template: `
    <div class="offcanvas-header">
      <h5 class="offcanvas-title">
        {{ sourceInfo.name }} | Tech Metadata
      </h5>
      <button
        type="button"
        class="btn-close text-reset"
        aria-label="Close"
        (click)="activeOffcanvas.dismiss()"
      ></button>
    </div>
    <div class="offcanvas-body">
      <div class="d-flex flex-column h-100">
        <div class="flex-grow-1" style="overflow: scroll">
          <ngx-json-viewer #ngxJsonViewer [json]="mediaInfo.general_properties" [expanded]="true"></ngx-json-viewer>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetadataOffcanvasComponent extends BaseOffcanvas implements AfterViewInit {
  @ViewChild('ngxJsonViewer') ngxJsonViewer?: NgxJsonViewerComponent;

  sourceInfo!: SourceInfo;
  mediaInfo!: MediaInfo;

  constructor(activeOffcanvas: NgbActiveOffcanvas,
              private changeDetectorRef: ChangeDetectorRef) {
    super(activeOffcanvas);
  }

  ngAfterViewInit() {
    // this.ngxJsonViewer?.segments.forEach(segment => {
    //   this.ngxJsonViewer?.toggle(segment);
    // })
    // this.changeDetectorRef.detectChanges();
  }

  @HostBinding('class')
  get hostElementClass(): string | undefined {
    return 'metadata-offcanvas';
  }
}
