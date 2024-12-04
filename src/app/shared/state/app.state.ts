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

import {Select, Selector, State} from '@ngxs/store';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {TimelineConfiguratorState} from '../../features/main/timeline-configurator/timeline-configurator.state';
import {VuMeterState} from '../../features/main/vu-meter/vu-meter.state';
import {TelemetryState} from '../../features/main/telemetry/telemetry.state';

export interface AppStateModel {}

@State<AppStateModel>({
  name: 'app',
  defaults: {},
  children: [TimelineConfiguratorState, VuMeterState, TelemetryState],
})
@Injectable()
export class AppState {
  @Select(AppState) state$!: Observable<AppStateModel>;

  @Selector()
  static APP(state: AppStateModel) {
    return state;
  }
}
