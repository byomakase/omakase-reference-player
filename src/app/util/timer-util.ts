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

import {interval, Subject, takeUntil} from 'rxjs';

export interface TimeoutTimerEvent {
  timeoutDuration: number;
  refreshPeriod: number;
  numRefreshes: number;
  numTimeouts: number;
  startTime: number;
  elapsedTime: number;
}

export class TimeoutTimer {
  public readonly onRefresh$: Subject<TimeoutTimerEvent> = new Subject<TimeoutTimerEvent>();
  public readonly onTimeout$: Subject<TimeoutTimerEvent> = new Subject<TimeoutTimerEvent>();

  private _timeoutDuration: number;
  private _refreshPeriod: number;
  private _startTime: number | undefined;
  private _elapsedTime: number | undefined;
  private _numTimeouts: number = 0; // number of timeouts since start
  private _loopBreaker$ = new Subject<void>();
  private _onDestroy$ = new Subject<void>();

  constructor(duration: number, period: number) {
    this._timeoutDuration = duration;
    this._refreshPeriod = period;
  }

  destroy() {
    this.stop();
    this._onDestroy$.next();
    this._onDestroy$.complete();
  }

  start() {
    this.stop();
    if (this._timeoutDuration && this._refreshPeriod) {
      this._startTime = Date.now();
      interval(this._refreshPeriod)
        .pipe(takeUntil(this._onDestroy$), takeUntil(this._loopBreaker$))
        .subscribe((numRefreshes) => {
          if (this._timeoutDuration && this._refreshPeriod && this._startTime) {
            this._elapsedTime = Date.now() - this._startTime;
            this.onRefresh$.next({
              timeoutDuration: this._timeoutDuration,
              refreshPeriod: this._refreshPeriod,
              numTimeouts: this._numTimeouts,
              numRefreshes: numRefreshes,
              startTime: this._startTime,
              elapsedTime: this._elapsedTime,
            });
            if (this._elapsedTime >= this._timeoutDuration) {
              this._numTimeouts++;
              this.onTimeout$.next({
                timeoutDuration: this._timeoutDuration,
                refreshPeriod: this._refreshPeriod,
                numTimeouts: this._numTimeouts,
                numRefreshes: numRefreshes,
                startTime: this._startTime,
                elapsedTime: this._elapsedTime,
              });
              this._startTime = Date.now();
            }
          }
        });
    }
  }

  stop() {
    this._loopBreaker$.next();
    this._loopBreaker$.complete();
    this._loopBreaker$ = new Subject<void>();
    this._numTimeouts = 0;
    this._startTime = void 0;
  }

  restart() {
    this.start();
  }

  get timeoutDuration(): number {
    return this._timeoutDuration;
  }

  get refreshPeriod(): number {
    return this._refreshPeriod;
  }

  get startTime(): number | undefined {
    return this._startTime;
  }

  get elapsedTime(): number | undefined {
    return this._elapsedTime;
  }
}
