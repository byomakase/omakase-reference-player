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

import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {HttpClientModule} from '@angular/common/http';
import {Title} from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientModule, RouterOutlet],
  providers: [],
  template: ` <router-outlet></router-outlet>`,
})
export class AppComponent {
  constructor(private title: Title) {
    this.title.setTitle(`Omakase Reference Player`);
  }
}
