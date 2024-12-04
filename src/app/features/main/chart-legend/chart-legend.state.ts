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
import {ChartLegendActions} from './chart-legend.actions';
import Show = ChartLegendActions.Show;
import Hide = ChartLegendActions.Hide;

export interface ChartLegendItem {
  color: string;
  label: string;
}

export interface ChartLegendStateModel {
  items?: ChartLegendItem[];
}

@State<ChartLegendStateModel>({
  name: 'chartLegend',
  defaults: {
    items: undefined,
  },
})
@Injectable()
export class ChartLegendState {
  @Selector()
  static items(state: ChartLegendStateModel) {
    return state.items;
  }

  @Action(Show)
  show(ctx: StateContext<ChartLegendStateModel>, {items}: Show) {
    const state = ctx.getState();
    ctx.patchState({
      items,
    });
  }

  @Action(Hide)
  maximize(ctx: StateContext<ChartLegendStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      items: undefined,
    });
  }
}
