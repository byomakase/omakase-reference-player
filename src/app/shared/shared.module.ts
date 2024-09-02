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

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DirectivesModule} from './directives/directives.module';
import {FormsModule as AppFormsModule} from './forms/forms.module';
import {ComponentsModule} from './components/components.module';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {RouterModule} from '@angular/router';
import {FilenamePipe} from './pipes/filename.pipe';
import {FilesizePipe} from './pipes/filesize.pipe';
import {NgbAccordionModule, NgbDropdownModule, NgbModalModule, NgbNavModule, NgbOffcanvasModule} from '@ng-bootstrap/ng-bootstrap';
import {JoinPipe} from './pipes/join.pipe';
import {MixedCasePipe} from './pipes/mixed-case.pipe';
import {NgxJsonViewerModule} from 'ngx-json-viewer';

const NGB = [
  NgbModalModule,
  NgbDropdownModule,
  NgbNavModule,
  NgbAccordionModule,
  NgbOffcanvasModule,
]

const MODULES = [
  CommonModule,
  FormsModule,
  RouterModule,
  ReactiveFormsModule,
  ComponentsModule,
  DirectivesModule,
  AppFormsModule,
  ...NGB,
  NgxJsonViewerModule
]

const PIPES = [
  FilenamePipe,
  FilesizePipe,
  JoinPipe,
  MixedCasePipe
]

@NgModule({
  declarations: [
    ...PIPES,
  ],
  imports: [
    ...MODULES
  ],
  exports: [
    ...MODULES,
    ...PIPES
  ],
  providers: [
    ...PIPES
  ]
})
export class SharedModule {
}
