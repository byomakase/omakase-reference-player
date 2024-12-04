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

import {Component, HostBinding, HostListener, OnDestroy, OnInit} from '@angular/core';
import {CoreModule} from '../../../core/core.module';
import {SharedModule} from '../../../shared/shared.module';
import {animate, AnimationEvent, state, style, transition, trigger} from '@angular/animations';
import {Select, Store} from '@ngxs/store';
import {TelemetryCue, TelemetryState, TelemetryStateModel} from './telemetry.state';
import {filter, map, Observable, sampleTime, Subject, Subscription, switchMap, take, takeUntil} from 'rxjs';
import {OmakaseVttCue, OmakaseVttCueEvent} from '@byomakase/omakase-player';
import {TelemetryLane, TimelineService} from '../../timeline/timeline.service';
import {TelemetryActions} from './telemetry.actions';
import {OmpApiService} from '../../../shared/components/omakase-player/omp-api.service';
import Minimize = TelemetryActions.Minimize;
import Maximize = TelemetryActions.Maximize;
import SetCues = TelemetryActions.SetCues;
import SelectLane = TelemetryActions.SelectLane;

const animateDurationMs = 300;
const animateTimings = `${animateDurationMs}ms ease-in-out`;
const vuMeterSingleBarWidth = 25;
const maximizedWidth = 350;
const sampleTimeSyncVideoMetadata: number = 100;

@Component({
  selector: 'div[appTelemetry]',
  standalone: true,
  imports: [CoreModule, SharedModule],
  template: `
    <div
      class="telemetry-frame d-flex flex-column h-100"
      [class.minimized]="(animationState | async) === 'minimized'"
      [class.maximized]="(animationState | async) === 'maximized'"
      [@toggleMinimizeMaximize]="{
        value: (animationState | async),
        params: {minimizedWidth: minimizedWidth, maximizedWidth: maximizedWidth},
      }"
      (@toggleMinimizeMaximize.start)="onAnimationEventStart($event)"
      (@toggleMinimizeMaximize.done)="onAnimationEventDone($event)"
    >
      <div class="telemetry-header">
        <div class="d-flex h-100">
          <div class="btn-group expand-button" role="group">
            <button type="button" class="btn btn-maximize" (click)="maximize()"></button>
          </div>
          <div class="telemetry-title d-flex w-100">
            <div><i appIcon="telemetry" class="telemetry-icon"></i></div>
            <div class="telemetry-title-text flex-grow-1">{{ selectedLaneTitle }}</div>
            <div><i appIcon="close" class="close-icon" (click)="minimize()"></i></div>
          </div>
        </div>
      </div>

      <div class="telemetry-content flex-grow-1">
        @for (cue of cues | async; track cue.id) {
          <div class="telemetry-cue" [ngClass]="{'fade-out': cue.fadeOut}">
            <!-- <div class="telemetry-cue-header">
              <i appIcon="telemetry" [ngStyle]="{ color: cue.color }"></i>
              <div class="telemetry-cue-title">{{ cue.title }}</div>
            </div> -->
            <div class="telemetry-cue-footer">
              <div class="telemetry-start-time">IN: {{ cue.startTimecode }}</div>
              <div class="telemetry-end-time">OUT: {{ cue.endTimecode }}</div>
            </div>
            <div class="telemetry-cue-text">
              @for (line of cue.lines; track $index) {
                <div>{{ line }}</div>
              }
            </div>
          </div>
        }
      </div>
      <div class="telemetry-placeholder flex-grow-1">TELEMETRY</div>
    </div>
  `,
  animations: [
    trigger('toggleMinimizeMaximize', [
      state(
        'minimized',
        style({
          width: `{{minimizedWidth}}px`,
        }),
        {params: {minimizedWidth: 0}}
      ),
      state(
        'maximized',
        style({
          width: `{{maximizedWidth}}px`,
        }),
        {params: {maximizedWidth: 0}}
      ),
      transition('* => *', [animate(animateTimings)]),
    ]),
  ],
})
export class TelemetryComponent implements OnInit, OnDestroy {
  @Select(TelemetryState) state$!: Observable<TelemetryStateModel>;

  private _minimizedWidth: number = vuMeterSingleBarWidth * 2;
  private _maximizedWidth: number = maximizedWidth;

  private _removeDelay: number = 5; // delay before removing exited cues (in seconds)
  private _seekDelay: number = 2; // delay for displaying old cues on seek (in seconds)
  private _maxCount: number = 3; // maximum number of cues shown

  private _cueSubscription?: Subscription;
  private _videoSubscription?: Subscription;
  private _seekSubscription?: Subscription;
  private _replaySubscription?: Subscription;

  private _lastSelectedLane?: TelemetryLane;
  private _selectedLaneTitle?: string;

  private _destroyed$ = new Subject<void>();

  constructor(
    protected store: Store,
    protected ompApiService: OmpApiService,
    protected timelineService: TimelineService
  ) {}

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return 'telemetry';
  }

  @HostListener('window:resize')
  onResize() {
    const visibility = this.store.selectSnapshot(TelemetryState.visibility);
    if (visibility === 'maximized' && !this.timelineService.isTelemetryComponentShown()) {
      this.store.dispatch(new Minimize());
    }
  }

  ngOnInit() {
    this.store
      .select(TelemetryState.visibility)
      .pipe(takeUntil(this._destroyed$))
      .subscribe({
        next: (visibility) => {
          if (visibility === 'maximized' && !this.store.selectSnapshot(TelemetryState.selectedLaneId)) {
            const lane = this.timelineService.getFirstTelemetryLane();
            this.store.dispatch(new SelectLane(lane?.id));
          } else if (visibility === 'minimized' && !!this.store.selectSnapshot(TelemetryState.selectedLaneId)) {
            this.store.dispatch(new SelectLane(undefined));
          }
        },
      });
    this.store
      .select(TelemetryState.selectedLaneId)
      .pipe(takeUntil(this._destroyed$))
      .subscribe({
        next: (selectedLaneId) => {
          this._cueSubscription?.unsubscribe();
          this._videoSubscription?.unsubscribe();
          this._seekSubscription?.unsubscribe();
          this._replaySubscription?.unsubscribe();
          const visibility = this.store.selectSnapshot(TelemetryState.visibility);
          if (selectedLaneId) {
            const selectedLane = this.timelineService.getTimelineLaneById(selectedLaneId) as TelemetryLane;
            if (!selectedLane) {
              // if the selected lane id is no longer valid (due to changing the manifest), then close the telemetry
              this.store.dispatch(new Minimize());
              return;
            }
            const cues = this.getCuesUntilTime(this.ompApiService.api!.video.getCurrentTime());
            this.store.dispatch(new SetCues(cues));
            this._selectedLaneTitle = this.getSelectedLaneTitle(selectedLane);
            selectedLane.activateTelemetryIcon();
            this._lastSelectedLane?.deactivateTelemetryIcon();
            this._lastSelectedLane = selectedLane;
            this._cueSubscription = this.getCueEventsSubscription(selectedLane!);
            this._videoSubscription = this.getVideoProgressSubscription();
            this._seekSubscription = this.getVideoSeekSubscription();
            this._replaySubscription = this.getVideoReplaySubscription();
            if (visibility === 'minimized') {
              this.store.dispatch(new Maximize());
            }
          } else {
            this.store.dispatch(new SetCues([]));
            this._lastSelectedLane?.deactivateTelemetryIcon();
            this._lastSelectedLane = undefined;
            this._selectedLaneTitle = undefined;
            if (visibility === 'maximized') {
              this.store.dispatch(new Minimize());
            }
          }
        },
      });
  }

  toggleMinimizeMaximize() {
    if (this.store.selectSnapshot(TelemetryState.visibility) === 'minimized') {
      this.maximize();
    } else {
      this.minimize();
    }
  }

  minimize() {
    this.store.dispatch(new Minimize());
  }

  maximize() {
    this.store.dispatch(new Maximize());
  }

  onAnimationEventStart(event: AnimationEvent) {}

  onAnimationEventDone(event: AnimationEvent) {}

  get animationState(): Observable<string> {
    return this.state$.pipe(
      take(1),
      map((p) => p.visibility)
    );
  }

  get cues(): Observable<TelemetryCue[]> {
    return this.state$.pipe(
      take(1),
      map((p) => p.cues)
    );
  }

  get selectedLaneTitle(): string {
    return this._selectedLaneTitle ?? '';
  }

  get minimizedWidth(): number {
    return this._minimizedWidth;
  }

  set minimizedWidth(value: number) {
    this._minimizedWidth = value;
  }

  get maximizedWidth(): number {
    return this._maximizedWidth;
  }

  set maximizedWidth(value: number) {
    this._maximizedWidth = value;
  }

  ngOnDestroy() {
    this._destroyed$.next();
  }

  private getCueEventsSubscription(selectedLane: TelemetryLane): Subscription {
    const videoCueEvent$: Observable<OmakaseVttCueEvent<OmakaseVttCue>> = selectedLane.onVideoCueEvent$;
    return videoCueEvent$
      .pipe(
        filter((event) => event.action === 'entry'),
        takeUntil(this._destroyed$)
      )
      .subscribe((event) => {
        if (event.cue && this.isTelemetryCue(event.cue)) {
          this.addCue(event.cue);
        }
      });
  }

  private getVideoProgressSubscription(): Subscription {
    return this.ompApiService.api!.video.onVideoTimeChange$.pipe(sampleTime(sampleTimeSyncVideoMetadata), takeUntil(this._destroyed$)).subscribe((time) => {
      const cues = this.getClonedCues();
      const expiredCues = cues.filter((cue) => !cue.fadeOut && time.currentTime - cue.endTime > this._removeDelay);
      if (expiredCues.length) {
        expiredCues.forEach((cue) => {
          this.prepareCueForRemoval(cue);
        });
        this.store.dispatch(new SetCues(cues));
      }
    });
  }

  private getVideoSeekSubscription(): Subscription {
    return this.ompApiService.api!.video.onSeeked$.pipe(takeUntil(this._destroyed$)).subscribe((seekEvent) => {
      const cues = this.getCuesUntilTime(seekEvent.currentTime);
      this.store.dispatch(new SetCues(cues));
    });
  }

  private getVideoReplaySubscription(): Subscription {
    return this.ompApiService.api!.video.onEnded$.pipe(switchMap(() => this.ompApiService.api!.video.onPlay$.pipe(takeUntil(this.ompApiService.api!.video.onSeeked$)))).subscribe(() => {
      this.store.dispatch(new SetCues([]));
    });
  }

  private getClonedCues() {
    return [...this.store.selectSnapshot(TelemetryState.cues)].map((cue) => structuredClone(cue));
  }

  private addCue(cue: OmakaseVttCue) {
    let cues = this.getClonedCues();
    if (cues.find((c) => c.index === cue.index)) {
      return;
    }
    cues.unshift(this.transformCue(cue));
    if (cues.length > this._maxCount) {
      this.prepareCueForRemoval(cues[this._maxCount]);
    }
    this.store.dispatch(new SetCues(cues));
  }

  private prepareCueForRemoval(cue: TelemetryCue) {
    cue.fadeOut = true;
    setTimeout(() => {
      this.removeCue(cue);
    }, 1000);
  }

  private removeCue(toRemove: TelemetryCue) {
    let cues = this.getClonedCues();
    const cue = cues.find((cue) => cue.index === toRemove.index);
    if (!cue) {
      return;
    }
    cues.splice(cues.indexOf(cue), 1);
    this.store.dispatch(new SetCues(cues));
  }

  private getCuesUntilTime(time: number): TelemetryCue[] {
    const selectedLaneId = this.store.selectSnapshot(TelemetryState.selectedLaneId);
    const selectedLane = this.timelineService.getTimelineLaneById(selectedLaneId!) as TelemetryLane;
    const startTime = Math.max(time - this._seekDelay, 0);
    const endTime = time + this._seekDelay;
    const cues: OmakaseVttCue[] = selectedLane.vttFile?.findCues(startTime, endTime).filter((cue) => cue.startTime <= endTime && cue.endTime >= startTime) ?? [];
    return this.findNearestCues(cues, time);
  }

  private findNearestCues(cues: OmakaseVttCue[], time: number): TelemetryCue[] {
    const telemetryCues = cues.filter((cue) => this.isTelemetryCue(cue));
    const sortedCues = telemetryCues.sort((c1, c2) => this.getCueDistance(c1, time) - this.getCueDistance(c2, time));
    const nearestCues = telemetryCues.filter((cue) => this.getCueDistance(cue, time) === this.getCueDistance(sortedCues[0], time));
    return nearestCues
      .map((cue) => this.transformCue(cue))
      .reverse()
      .slice(-this._maxCount);
  }

  private getCueDistance(cue: OmakaseVttCue, time: number) {
    if (cue.startTime <= time && cue.endTime >= time) {
      return 0;
    } else if (cue.startTime > time) {
      return cue.startTime - time;
    } else {
      return time - cue.endTime;
    }
  }

  private transformCue(cue: OmakaseVttCue): TelemetryCue {
    const selectedLaneId = this.store.selectSnapshot(TelemetryState.selectedLaneId);
    return {
      id: `${selectedLaneId}_${cue.index}`,
      index: cue.index,
      startTime: cue.startTime,
      endTime: cue.endTime,
      startTimecode: this.ompApiService.api!.video.formatToTimecode(cue.startTime),
      endTimecode: this.ompApiService.api!.video!.formatToTimecode(cue.endTime),
      lines: this.getCueLines(cue),
    };
  }

  private isTelemetryCue(cue: OmakaseVttCue): boolean {
    return !!cue.extension?.rows?.find((row) => row.measurement || row.comment);
  }

  private getCueLines(cue: OmakaseVttCue): string[] {
    const lines: string[] = [];
    if (!cue.extension?.rows) {
      return lines;
    }
    for (const row of cue.extension?.rows) {
      if (row.measurement) {
        lines.push(`${row.measurement}=${row.value}`);
      }
      if (row.comment) {
        lines.push(row.comment);
      }
    }
    return lines;
  }

  private getSelectedLaneTitle(selectedLane: any): string {
    const parentLane = selectedLane._timeline._timelineLanes.find((lane: any) => lane._childLanes?.includes(selectedLane));
    return `${parentLane._description} / ${selectedLane._description}`;
  }
}
