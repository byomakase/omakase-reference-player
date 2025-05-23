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

import {Injectable} from '@angular/core';
import {NgbOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {MetadataOffcanvasComponent} from './metadata-offcanvas.component';
import {MediaInfo, SourceInfo} from '../../../model/domain.model';

@Injectable({
  providedIn: 'root',
})
export class MetadataOffcanvasService {
  constructor(private ngbOffcanvas: NgbOffcanvas) {}

  open(sourceInfo: SourceInfo, mediaInfo: MediaInfo) {
    let offcanvasRef = this.ngbOffcanvas.open(MetadataOffcanvasComponent, {
      panelClass: 'offcanvas',
    });

    let component = offcanvasRef.componentInstance as MetadataOffcanvasComponent;

    component.sourceInfo = sourceInfo;
    component.mediaInfo = mediaInfo;
  }
}
