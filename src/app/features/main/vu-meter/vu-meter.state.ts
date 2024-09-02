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
import {Action, Selector, State, StateContext} from '@ngxs/store';
import {VuMeterActions} from './vu-meter.actions';
import Minimize = VuMeterActions.Minimize;
import Maximize = VuMeterActions.Maximize;
import ToggleMinimizeMaximize = VuMeterActions.ToggleMinimizeMaximize;

export interface VuMeterStateModel {
  visibility: 'minimized' | 'maximized'
}

@State<VuMeterStateModel>({
  name: 'vuMeter',
  defaults: {
    visibility: 'minimized'
  }
})
@Injectable()
export class VuMeterState {

  @Selector()
  static visibility(state: VuMeterStateModel) {
    return state.visibility;
  }

  @Action(Minimize)
  minimize(ctx: StateContext<VuMeterStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      visibility: 'minimized',
    })
  }

  @Action(Maximize)
  maximize(ctx: StateContext<VuMeterStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      visibility: 'maximized',
    })
  }

  @Action(ToggleMinimizeMaximize)
  toggleMinimizeMaximize(ctx: StateContext<VuMeterStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      visibility: state.visibility === 'minimized' ? 'maximized' : 'minimized',
    })
  }

}
