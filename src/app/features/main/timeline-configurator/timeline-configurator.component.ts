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
import {DropdownComponent, DropdownOption} from '../../../shared/components/dropdown/dropdown.component';
import {CheckboxComponent} from '../../../shared/components/checkbox/checkbox.component';
import {TelemetryLane, TimelineService} from '../../timeline/timeline.service';
import {BaseGroupingLane} from '../../../shared/components/omakase-player/omakase-player-timeline/grouping/base-grouping-lane';
import Minimize = TimelineConfiguratorActions.Minimize;
import Maximize = TimelineConfiguratorActions.Maximize;
import SelectLane = TimelineConfiguratorActions.SelectLane;

const animateDurationMs = 300
const minimizedWidth = 0;
const maximizedWidth = 375;
const animateTimings = `${animateDurationMs}ms ease-in-out`;

@Component({
  selector: 'div[timelineConfigurator]',
  standalone: true,
  imports: [
    SharedModule,
    DropdownComponent,
    CheckboxComponent
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

      <div class="d-flex justify-content-end timeline-config-header">
        <div class="flex-grow-1 timeline-config-title">TIMELINE CONFIGURATION</div>
        <div class="btn-group" role="group">
          <div><i appIcon="close" class="close-icon" (click)="minimize()"></i></div>
        </div>
      </div>
      <div class="timeline-config-selector">
        <app-dropdown [options]="laneOptions$ | async" [selectedOption]="selectedLaneId$ | async" (onSelected)="selectLane($event)"></app-dropdown>
      </div>
      @if (selectedLane) {
        <div class="timeline-config-body">
          <app-checkbox [isChecked]="!selectedLane.isMinimized()" label="Enable track" (onChecked)="toggleLane(selectedLane)"></app-checkbox>
          <div class="timeline-config-suboptions">
            @for (lane of analyticsLanes; track lane.id) {
              <app-checkbox [isChecked]="!lane.isHidden" [isDisabled]="selectedLane.isMinimized()" [label]="lane.description" (onChecked)="toggleLane(lane)"></app-checkbox>
            }
          </div>
        </div>
      }
      <!--<div class="timeline-config-header">
        <div class="timeline-config-title">CUSTOMIZATION</div>
      </div>
      <div class="timeline-config-body timeline-config-customization">
        <div class="timeline-config-row">
          <div class="timeline-config-label">Waweform:</div>
          <div class="timeline-config-dropdown">
            <app-dropdown [options]="options" [selectedOption]="options[0].value" [isSmall]="true"></app-dropdown>
          </div>
        </div>
        <div class="timeline-config-row">
          <div class="timeline-config-label">Thumbnail:</div>
          <div class="timeline-config-dropdown">
            <app-dropdown [options]="options" [selectedOption]="options[0].value" [isSmall]="true"></app-dropdown>
          </div>
        </div>
        <div class="timeline-config-row">
          <div class="timeline-config-label">Analysis:</div>
          <div class="timeline-config-dropdown">
            <app-dropdown [options]="options" [selectedOption]="options[0].value" [isSmall]="true"></app-dropdown>
          </div>
        </div>
      </div>
    </div>-->
  `
})
export class TimelineConfiguratorComponent implements OnInit, OnDestroy {
  @Select(TimelineConfiguratorState) state$!: Observable<TimelineConfiguratorStateModel>;

  @Input()
  timelineApi: TimelineApi | undefined;

  // options = [
  //   {
  //     label: 'Small',
  //     value: 's'
  //   }
  // ]

  selectedLaneId$ = this.store.select(TimelineConfiguratorState.selectedLaneId);
  laneOptions$ = this.store.select(TimelineConfiguratorState.laneOptions);

  selectedLane?: BaseGroupingLane<any>;
  analyticsLanes: TelemetryLane[] = [];

  private _timelineResizeTimer: TimeoutTimer = new TimeoutTimer(1000, 30);

  private _onDestroy$ = new Subject<void>();

  constructor(
    protected store: Store,
    protected timelineService: TimelineService
  ) {
    this._timelineResizeTimer.onRefresh$.pipe(takeUntil(this._onDestroy$)).subscribe(value => {
      this.timelineSettleLayout();
    })
  }

  ngOnInit() {
    this.store
      .select(TimelineConfiguratorState.visibility)
      .pipe(takeUntil(this._onDestroy$))
      .subscribe({
        next: (visibility) => {
          if (visibility === 'minimized' && !!this.store.selectSnapshot(TimelineConfiguratorState.selectedLaneId)) {
            this.store.dispatch(new SelectLane(undefined));
          }
        },
      });
    this.store
      .select(TimelineConfiguratorState.selectedLaneId)
      .pipe(takeUntil(this._onDestroy$))
      .subscribe({
        next: (selectedLaneId) => {
          const visibility = this.store.selectSnapshot(TimelineConfiguratorState.visibility);
          if (selectedLaneId) {
            this.selectedLane = this.timelineService.getTimelineLaneById(selectedLaneId) as BaseGroupingLane<any>;
            this.analyticsLanes = this.selectedLane.childLanes.filter(lane => this.timelineService.isAnalyticsLane(lane)) as TelemetryLane[];
            if (visibility === 'minimized') {
              this.store.dispatch(new Maximize());
            }
          } else {
            this.selectedLane = undefined;
            this.analyticsLanes = [];
            if (visibility === 'maximized') {
              this.store.dispatch(new Minimize());
            }
          }
        },
      });
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

  selectLane(lane: DropdownOption<string>) {
    this.store.dispatch(new SelectLane(lane.value));
  }

  toggleLane(lane: TelemetryLane | BaseGroupingLane<any>) {
    lane.toggleHidden();
  }

  private timelineSettleLayout() {
    this.timelineApi?.settleLayout();
  }

  get animationState(): Observable<string> {
    return this.state$.pipe(take(1), map(p => p.visibility));
  }


}
