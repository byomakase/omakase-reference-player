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
import {TimelineConfiguratorActions} from './timeline-configurator.actions';
import {DropdownOption} from '../../../shared/components/dropdown/dropdown.component';
import Minimize = TimelineConfiguratorActions.Minimize;
import Maximize = TimelineConfiguratorActions.Maximize;
import ToggleMinimizeMaximize = TimelineConfiguratorActions.ToggleMinimizeMaximize;
import SelectLane = TimelineConfiguratorActions.SelectLane;
import SetLaneOptions = TimelineConfiguratorActions.SetLaneOptions;

export interface TimelineConfiguratorStateModel {
  visibility: 'minimized' | 'maximized',
  selectedLaneId: string | undefined,
  laneOptions: DropdownOption<string>[];
}

@State<TimelineConfiguratorStateModel>({
  name: 'timelineConfigurator',
  defaults: {
    visibility: 'minimized',
    selectedLaneId: undefined,
    laneOptions: []
  }
})
@Injectable()
export class TimelineConfiguratorState {

  @Selector()
  static visibility(state: TimelineConfiguratorStateModel) {
    return state.visibility;
  }

  @Selector()
  static selectedLaneId(state: TimelineConfiguratorStateModel) {
    return state.selectedLaneId;
  }

  @Selector()
  static laneOptions(state: TimelineConfiguratorStateModel) {
    return state.laneOptions;
  }

  @Action(Minimize)
  minimize(ctx: StateContext<TimelineConfiguratorStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      visibility: 'minimized',
    })
  }

  @Action(Maximize)
  maximize(ctx: StateContext<TimelineConfiguratorStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      visibility: 'maximized',
    })
  }

  @Action(ToggleMinimizeMaximize)
  toggleMinimizeMaximize(ctx: StateContext<TimelineConfiguratorStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      visibility: state.visibility === 'minimized' ? 'maximized' : 'minimized',
    })
  }

  @Action(SelectLane)
  selectLane(ctx: StateContext<TimelineConfiguratorStateModel>, { selectedLaneId }: SelectLane) {
    const state = ctx.getState();
    ctx.patchState({
      selectedLaneId,
    });
  }

  @Action(SetLaneOptions)
  setLaneOptions(ctx: StateContext<TimelineConfiguratorStateModel>, { options }: SetLaneOptions) {
    const state = ctx.getState();
    ctx.patchState({
      laneOptions: options,
    });
  }

}
