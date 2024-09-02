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

import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, OnDestroy, Output} from '@angular/core';
import {ConfigWithOptionalStyle, OmakasePlayerApi, SubtitlesLoadedEvent, TimelineApi, TimelineConfig} from '@byomakase/omakase-player';
import {combineLatest, Subject, takeUntil} from 'rxjs';
import {UuidUtil} from '../../../../util/uuid-util';

@Component({
  selector: 'div[appOmakasePlayerTimeline]',
  standalone: true,
  imports: [],
  template: `<ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OmakasePlayerTimelineComponent implements OnDestroy {
  @Output()
  readonly onReady: EventEmitter<TimelineApi> = new EventEmitter<TimelineApi>();

  @Output()
  readonly onSubtitlesLoaded: EventEmitter<SubtitlesLoadedEvent> = new EventEmitter<SubtitlesLoadedEvent>();

  private _config: Partial<ConfigWithOptionalStyle<TimelineConfig>> | undefined;
  private _presetConfig: Partial<ConfigWithOptionalStyle<TimelineConfig>>;

  private _omakasePlayerApi: OmakasePlayerApi | undefined;

  private _omakasePlayerReady$ = new Subject<void>();

  private _onDestroy$ = new Subject<void>();

  constructor() {
    this._presetConfig = {
      timelineHTMLElementId: UuidUtil.uuid()
    }

    this._config = this._presetConfig;

    combineLatest([this._omakasePlayerReady$]).pipe(takeUntil(this._onDestroy$)).subscribe({
      next: () => {
        this.createTimeline()
      },
      error: err => {

      }
    })
  }

  ngOnDestroy() {
    this.destroyTimeline();
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return this.config?.timelineHTMLElementId;
  }

  @HostBinding('class')
  get hostElementClass(): string | undefined {
    return 'app-omakase-player-timeline';
  }

  private createTimeline() {
    this.destroyTimeline();

    if (this._omakasePlayerApi && this.config) {
      this._omakasePlayerApi.createTimeline(this.config).subscribe(timelineApi => {
        this.onReady.emit(timelineApi);
      })
      this._omakasePlayerApi.subtitles.onSubtitlesLoaded$.subscribe(event => {
        this.onSubtitlesLoaded.emit(event);
      })
    }
  }

  private destroyTimeline() {
    if (this._omakasePlayerApi?.timeline) {
      this._omakasePlayerApi.timeline.destroy();
    }
  }

  @Input()
  set omakasePlayerApi(value: OmakasePlayerApi | undefined) {
    this._omakasePlayerApi = value;
    if (this._omakasePlayerApi) {
      this._omakasePlayerReady$.next();
    }
  }

  @Input('config')
  set config(value: Partial<ConfigWithOptionalStyle<TimelineConfig>> | undefined) {
    this._config = {
      ...this._presetConfig,
      ...value
    };
  }

  get config(): Partial<ConfigWithOptionalStyle<TimelineConfig>> | undefined {
    return this._config;
  }
}
