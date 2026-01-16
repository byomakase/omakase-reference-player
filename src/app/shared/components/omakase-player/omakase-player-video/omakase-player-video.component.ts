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

import {AfterViewInit, Component, HostBinding, Input, OnDestroy, OnInit} from '@angular/core';
import {ControlBarVisibility, OmakasePlayerConfig, PlayerChromingTheme} from '@byomakase/omakase-player';
import {Subject} from 'rxjs';
import {CryptoUtil} from '../../../../util/crypto-util';
import {OmpApiService} from '../omp-api.service';

@Component({
    selector: 'div[appOmakasePlayerVideo]',
    imports: [],
    template: ` <ng-content></ng-content>`
})
export class OmakasePlayerVideoComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input('config')
  config: Partial<OmakasePlayerConfig> | undefined;

  private _onDestroy$ = new Subject<void>();

  constructor(protected ompApiService: OmpApiService) {}

  ngOnInit(): void {
    let possibleConfig: Partial<OmakasePlayerConfig> = {
      playerHTMLElementId: CryptoUtil.uuid(),
      playerChroming: {
        theme: PlayerChromingTheme.Default,
        themeConfig: {
          controlBarVisibility: ControlBarVisibility.FullscreenOnly,
        },
        styleUrl: './assets/css/chroming.css',
      },
    };

    // ensure playerHTMLElementId is set because it has to be in component template before OmakasePlayer instantiation
    if (this.config && !this.config.playerHTMLElementId) {
      this.config = {
        ...this.config,
        ...possibleConfig,
      };
    } else if (!this.config) {
      this.config = {
        ...possibleConfig,
      };
    } else {
      // config is set and config.playerHTMLElementId is set, continue
    }
  }

  ngAfterViewInit() {
    this.ompApiService.create(this.config);
  }

  ngOnDestroy() {
    this._onDestroy$.next();
    this._onDestroy$.complete();
    this.ompApiService.destroy();
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return this.config?.playerHTMLElementId;
  }
}
