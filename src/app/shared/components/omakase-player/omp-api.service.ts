import {Injectable} from '@angular/core';
import {OmakasePlayer, OmakasePlayerApi, OmakasePlayerConfig} from '@byomakase/omakase-player';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OmpApiService {
  readonly onCreate$: BehaviorSubject<OmakasePlayerApi | undefined> = new BehaviorSubject<OmakasePlayerApi | undefined>(void 0);

  private _omakasePlayerApi: OmakasePlayerApi | undefined;

  constructor() {}

  create(config: Partial<OmakasePlayerConfig> | undefined = void 0) {
    this.destroy();
    this._omakasePlayerApi = new OmakasePlayer(config);
    // @ts-ignore
    window['omp'] = this._omakasePlayerApi;
    this.onCreate$.next(this._omakasePlayerApi);
  }

  destroy() {
    if (this._omakasePlayerApi) {
      try {
        this._omakasePlayerApi.destroy();
      } catch (e) {
        console.error(e);
      }
      this._omakasePlayerApi = void 0;
      this.onCreate$.next(this._omakasePlayerApi);
    }
  }

  get api(): OmakasePlayerApi | undefined {
    return this._omakasePlayerApi;
  }
}
