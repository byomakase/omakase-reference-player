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
import {Action, Selector, State, StateContext} from '@ngxs/store';
import {SegmentationActions} from './segmentation.actions';
import SetTracks = SegmentationActions.SetTracks;
import SetActiveTrack = SegmentationActions.SetActiveTrack;
import AddTrack = SegmentationActions.AddTrack;
import DeleteTrack = SegmentationActions.DeleteTrack;
import UpdateTrack = SegmentationActions.UpdateTrack;

export interface SegmentationTrack {
  id: string;
  name: string;
  color: string;
  markerLaneId: string;
}

export interface SegmentationStateModel {
  tracks: SegmentationTrack[];
  activeTrack?: SegmentationTrack;
}

@State<SegmentationStateModel>({
  name: 'segmentation',
  defaults: {
    tracks: [],
  },
})
@Injectable()
export class SegmentationState {
  constructor() {}

  @Selector()
  static tracks(state: SegmentationStateModel) {
    return state.tracks;
  }

  @Selector()
  static activeTrack(state: SegmentationStateModel) {
    return state.activeTrack;
  }

  @Action(SetTracks)
  setTracks(ctx: StateContext<SegmentationStateModel>, {tracks}: SetTracks) {
    const state = ctx.getState();
    ctx.patchState({
      tracks,
      activeTrack: undefined,
    });
  }

  @Action(SetActiveTrack)
  setActiveTrack(ctx: StateContext<SegmentationStateModel>, {track}: SetActiveTrack) {
    const state = ctx.getState();
    ctx.patchState({
      activeTrack: track,
    });
  }

  @Action(AddTrack)
  addTrack(ctx: StateContext<SegmentationStateModel>, {track}: AddTrack) {
    const state = ctx.getState();
    const tracks = [...state.tracks];
    tracks.push(track);
    ctx.patchState({
      tracks,
    });
  }

  @Action(DeleteTrack)
  deleteTrack(ctx: StateContext<SegmentationStateModel>, {track}: DeleteTrack) {
    const state = ctx.getState();
    const tracks = [...state.tracks];
    tracks.splice(tracks.indexOf(track), 1);
    ctx.patchState({
      tracks,
    });
    if (ctx.getState().activeTrack === track) {
      ctx.patchState({
        activeTrack: undefined,
      });
    }
  }

  @Action(UpdateTrack)
  updateTrack(ctx: StateContext<SegmentationStateModel>, {trackId, updateValue}: UpdateTrack) {
    const state = ctx.getState();
    const tracks = [...state.tracks];
    const track = tracks.find((t) => t.id === trackId);
    if (!track) {
      return;
    }
    const updatedTrack = {
      ...track,
      ...updateValue,
    };
    tracks.splice(tracks.indexOf(track), 1, updatedTrack);
    if (state.activeTrack === track) {
      ctx.patchState({
        activeTrack: updatedTrack,
        tracks,
      });
    } else {
      ctx.patchState({
        tracks,
      });
    }
  }
}
