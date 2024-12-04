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
import {NgbNav} from '@ng-bootstrap/ng-bootstrap';
import {MetadataExplorerService} from './metadata-explorer.service';

@Component({
  selector: 'div[appMetadataExplorerContent]',
  standalone: true,
  imports: [CoreModule, SharedModule],
  template: `
    <div id="metadata-content" #metadataContent (scroll)="onMetadataContentScroll($event)">
      <div [ngbNavOutlet]="ngbNav"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetadataExplorerContentComponent {
  @ViewChild('metadataContent') metadataContentElementRef!: ElementRef;

  private ngbNavElement!: NgbNav;

  constructor(private metadataExplorerService: MetadataExplorerService) {}

  ngOnInit() {
    this.metadataExplorerService.metadataContentElementRef = this.metadataContentElementRef;
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'metadata-explorer';
  }

  @Input()
  set ngbNav(value: NgbNav) {
    this.ngbNavElement = value;
  }

  get ngbNav(): NgbNav {
    return this.ngbNavElement;
  }

  onMetadataContentScroll(event: any) {
    this.metadataExplorerService.onMetadataContentScroll(event);
  }
}
