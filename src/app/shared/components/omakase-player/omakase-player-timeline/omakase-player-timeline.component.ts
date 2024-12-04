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
import {ConfigWithOptionalStyle, TimelineApi, TimelineConfig} from '@byomakase/omakase-player';
import {Subject, take, takeUntil} from 'rxjs';
import {CryptoUtil} from '../../../../util/crypto-util';
import {OmpApiService} from '../omp-api.service';

@Component({
  selector: 'div[appOmakasePlayerTimeline]',
  standalone: true,
  imports: [],
  template: ` <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OmakasePlayerTimelineComponent implements OnDestroy {
  @Output()
  readonly onReady: EventEmitter<TimelineApi> = new EventEmitter<TimelineApi>();

  private _config: Partial<ConfigWithOptionalStyle<TimelineConfig>> | undefined;
  private _presetConfig: Partial<ConfigWithOptionalStyle<TimelineConfig>>;

  private _onDestroy$ = new Subject<void>();

  constructor(protected ompApiService: OmpApiService) {
    this._presetConfig = {
      timelineHTMLElementId: CryptoUtil.uuid(),
    };

    this._config = this._presetConfig;

    this.ompApiService.onCreate$.pipe(takeUntil(this._onDestroy$)).subscribe({
      next: (omakasePlayerApi) => {
        if (omakasePlayerApi) {
          this.createTimeline();
        } else {
          // this.destroyTimeline()
        }
      },
      error: (err) => {},
    });
  }

  ngOnDestroy() {
    // this.destroyTimeline();
    if (this.ompApiService.api?.timeline) {
      this.ompApiService.api.timeline.destroy();
    }
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
    // this.destroyTimeline();

    if (this.config) {
      this.ompApiService.api!.createTimeline(this.config).subscribe({
        next: (timeline) => {
          timeline.onReady$.pipe(take(1)).subscribe({
            next: () => {
              this.onReady.emit(timeline);
            },
          });
        },
      });
    }
  }

  // private destroyTimeline() {
  //   if (this.ompApiService.api?.timeline) {
  //     this.ompApiService.api.timeline.destroy();
  //   }
  // }

  @Input('config')
  set config(value: Partial<ConfigWithOptionalStyle<TimelineConfig>> | undefined) {
    this._config = {
      ...this._presetConfig,
      ...value,
    };
  }

  get config(): Partial<ConfigWithOptionalStyle<TimelineConfig>> | undefined {
    return this._config;
  }
}
