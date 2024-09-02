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

import {AfterViewInit, Component, EventEmitter, HostBinding, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {OmakasePlayer, OmakasePlayerApi, OmakasePlayerConfig} from '@byomakase/omakase-player';
import {BehaviorSubject, Subject} from 'rxjs';
import {UuidUtil} from '../../../../util/uuid-util';

@Component({
  selector: 'div[appOmakasePlayerVideo]',
  standalone: true,
  imports: [],
  template: `<ng-content></ng-content>`,
})
export class OmakasePlayerVideoComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input('config')
  config: Partial<OmakasePlayerConfig> | undefined;

  @Output()
  readonly onReady: EventEmitter<OmakasePlayerApi> = new EventEmitter<OmakasePlayerApi>();
  readonly omakasePlayer$: Subject<OmakasePlayerApi | undefined> = new BehaviorSubject<OmakasePlayerApi | undefined>(void 0);

  private _omakasePlayerApi: OmakasePlayerApi | undefined;
  private _onDestroy$ = new Subject<void>();

  constructor() {

  }

  ngOnInit(): void {
    let possibleConfig: Partial<OmakasePlayerConfig> = {
      playerHTMLElementId: UuidUtil.uuid()
    }

    // ensure playerHTMLElementId is set because it has to be in component template before OmakasePlayer instantiation
    if (this.config && !this.config.playerHTMLElementId) {
      this.config = {
        ...this.config,
        ...possibleConfig
      }
    } else if (!this.config) {
      this.config = {
        ...possibleConfig
      }
    } else {
      // config is set and config.playerHTMLElementId is set, continue
    }
  }

  ngAfterViewInit() {
    this.createOmakasePlayer();
  }

  ngOnDestroy() {
    this._onDestroy$.next();
    this._onDestroy$.complete();
    this.destroyOmakasePlayer();
  }

  @HostBinding('id')
  get hostElementId(): string | undefined {
    return this.config?.playerHTMLElementId;
  }

  private createOmakasePlayer() {
    this.destroyOmakasePlayer();
    this._omakasePlayerApi = new OmakasePlayer(this.config);
    this.omakasePlayer$.next(this._omakasePlayerApi);
    this.onReady.emit(this._omakasePlayerApi);
  }

  private destroyOmakasePlayer() {
    if (this._omakasePlayerApi) {
      try {
        this._omakasePlayerApi.destroy();
      } catch (e) {
        console.error(e);
      }
      this._omakasePlayerApi = void 0;
    }
    this.omakasePlayer$.next(void 0);
  }

  get omakasePlayerApi(): OmakasePlayerApi | undefined {
    return this._omakasePlayerApi;
  }

}
