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
import {Component, HostListener} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {Store} from '@ngxs/store';
import {ChartLegendState} from './chart-legend.state';

@Component({
    selector: 'div[appChartLegend]',
    imports: [CoreModule, SharedModule],
    template: `
    @if (items$ | async) {
      <div class="chart-legend-container" [ngStyle]="{bottom, left}">
        @for (item of items$ | async; track item.label) {
          <div class="chart-legend-item">
            <div class="chart-legend-color" [ngStyle]="{'background-color': item.color}"></div>
            <div class="chart-legend-label">{{ item.label }}</div>
          </div>
        }
      </div>
    }
  `
})
export class ChartLegendComponent {
  items$ = this.store.select(ChartLegendState.items);
  bottom = '0';
  left = '0';

  constructor(protected store: Store) {}

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.store.selectSnapshot(ChartLegendState.items)) {
      // do not move while displayed
      return;
    }
    this.bottom = window.innerHeight - event.y - 20 + 'px';
    this.left = event.x + 20 + 'px';
  }
}
