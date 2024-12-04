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

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {ChartVttFile, MarkerVttFile} from './vtt-file';

@Injectable({
  providedIn: 'root',
})
export class VttService {
  constructor(protected http: HttpClient) {}

  fetchMarkerVtt(url: string): Observable<MarkerVttFile> {
    return this.http.get(url, {responseType: 'text'}).pipe(
      map((vttFileText) => {
        return new MarkerVttFile(vttFileText);
      })
    );
  }

  fetchChartVtt(url: string): Observable<ChartVttFile> {
    return this.http.get(url, {responseType: 'text'}).pipe(
      map((vttFileText) => {
        return new ChartVttFile(vttFileText);
      })
    );
  }
}
