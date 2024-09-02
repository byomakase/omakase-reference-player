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
import {TelemetryActions} from './telemetry.actions';
import Minimize = TelemetryActions.Minimize;
import Maximize = TelemetryActions.Maximize;
import SetCues = TelemetryActions.SetCues;
import SelectLane = TelemetryActions.SelectLane;
import ToggleMinimizeMaximize = TelemetryActions.ToggleMinimizeMaximize;

export interface TelemetryCue {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  startTimecode: string;
  endTimecode: string;
  lines: string[];
  fadeOut?: boolean;
}

export interface TelemetryStateModel {
  visibility: 'minimized' | 'maximized';
  selectedLaneId: string | undefined;
  cues: TelemetryCue[];
}

@State<TelemetryStateModel>({
  name: 'telemetry',
  defaults: {
    visibility: 'minimized',
    selectedLaneId: undefined,
    cues: [],
  },
})
@Injectable()
export class TelemetryState {
  constructor() {}

  @Selector()
  static visibility(state: TelemetryStateModel) {
    return state.visibility;
  }

  @Selector()
  static selectedLaneId(state: TelemetryStateModel) {
    return state.selectedLaneId;
  }

  @Selector()
  static cues(state: TelemetryStateModel) {
    return state.cues;
  }

  @Action(Minimize)
  minimize(ctx: StateContext<TelemetryStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      visibility: 'minimized',
    });
  }

  @Action(Maximize)
  maximize(ctx: StateContext<TelemetryStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      visibility: 'maximized',
    });
  }

  @Action(ToggleMinimizeMaximize)
  toggleMinimizeMaximize(ctx: StateContext<TelemetryStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      visibility: state.visibility === 'minimized' ? 'maximized' : 'minimized',
    });
  }

  @Action(SetCues)
  setCues(ctx: StateContext<TelemetryStateModel>, { cues }: SetCues) {
    const state = ctx.getState();
    ctx.patchState({
      cues,
    });
  }

  @Action(SelectLane)
  selectLane(ctx: StateContext<TelemetryStateModel>, { selectedLaneId }: SelectLane) {
    const state = ctx.getState();
    ctx.patchState({
      selectedLaneId,
    });
  }
}
