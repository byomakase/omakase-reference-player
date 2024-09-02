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

import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {animate, AnimationEvent, state, style, transition, trigger} from '@angular/animations';
import {map, Observable, Subject, take, takeUntil} from 'rxjs';
import {Select, Store} from '@ngxs/store';
import {TimelineConfiguratorActions} from './timeline-configurator.actions';
import {SharedModule} from '../../../shared/shared.module';
import {TimelineConfiguratorState, TimelineConfiguratorStateModel} from './timeline-configurator.state';
import {TimelineApi} from '@byomakase/omakase-player';
import {TimeoutTimer} from '../../../util/timer-util';
import Minimize = TimelineConfiguratorActions.Minimize;
import Maximize = TimelineConfiguratorActions.Maximize;

const animateDurationMs = 300
const minimizedWidth = 0;
const maximizedWidth = 300;
const animateTimings = `${animateDurationMs}ms ease-in-out`;

@Component({
  selector: 'div[timelineConfigurator]',
  standalone: true,
  imports: [
    SharedModule
  ],
  animations: [
    trigger('toggleMinimizeMaximize', [
      state('minimized', style({
        width: `${minimizedWidth}px`
      })),
      state('maximized', style({
        width: `${maximizedWidth}px`,
      })),
      transition('* => *', [
        animate(animateTimings),
      ])
    ]),
  ],
  template: `
    <div id="timeline-configurator"
         [@toggleMinimizeMaximize]="animationState|async"
         (@toggleMinimizeMaximize.start)="onAnimationEventStart($event)"
         (@toggleMinimizeMaximize.done)="onAnimationEventDone($event)">

      <div class="d-flex justify-content-end">
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-outline-primary" (click)="toggleMinimizeMaximize()">X</button>
        </div>
      </div>
    </div>
  `
})
export class TimelineConfiguratorComponent implements OnInit, OnDestroy {
  @Select(TimelineConfiguratorState) state$!: Observable<TimelineConfiguratorStateModel>;

  @Input()
  timelineApi: TimelineApi | undefined;

  private _timelineResizeTimer: TimeoutTimer = new TimeoutTimer(1000, 30);

  private _onDestroy$ = new Subject<void>();

  constructor(protected store: Store) {
    this._timelineResizeTimer.onRefresh$.pipe(takeUntil(this._onDestroy$)).subscribe(value => {
      this.timelineSettleLayout();
    })
  }

  ngOnInit() {

  }

  ngOnDestroy() {
    this._onDestroy$.next();
    this._onDestroy$.complete();
  }

  toggleMinimizeMaximize() {
    if (this.store.selectSnapshot(TimelineConfiguratorState.visibility) === 'minimized') {
      this.maximize();
    } else {
      this.minimize();
    }
  }

  minimize() {
    this.store.dispatch(new Minimize())
  }

  maximize() {
    this.store.dispatch(new Maximize())
  }

  onAnimationEventStart(event: AnimationEvent) {
    this._timelineResizeTimer.start();
  }

  onAnimationEventDone(event: AnimationEvent) {
    this._timelineResizeTimer.stop();
    this.timelineSettleLayout();
  }

  private timelineSettleLayout() {
    this.timelineApi?.settleLayout();
  }

  get animationState(): Observable<string> {
    return this.state$.pipe(take(1), map(p => p.visibility));
  }


}
