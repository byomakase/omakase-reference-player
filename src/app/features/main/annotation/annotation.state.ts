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
import {AnnotationActions} from './annotation.actions';
import SelectAnnotation = AnnotationActions.SelectAnnotation;
import AddAnnotation = AnnotationActions.AddAnnotation;
import DeleteAnnotation = AnnotationActions.DeleteAnnotation;
import UpdateAnnotation = AnnotationActions.UpdateAnnotation;
import ResetAnnotations = AnnotationActions.ResetAnnotations;
import {timecodeSortingStrategy} from '../annotation-list/annotation-list.sorting';

export type MarkerType = 'period' | 'moment';

export interface Annotation {
  id: string;
  body: string;
  start?: string;
  end?: string;
  isPrivate: boolean;
  thread?: string;
  user: string;
  createdAt: Date;
  markerType?: MarkerType;
  children?: Annotation[];
}

export interface AnnotationStateModel {
  annotations: Annotation[];
  selectedAnnotationId?: string;
}

@State<AnnotationStateModel>({
  name: 'annotation',
  defaults: {
    annotations: [],
  },
})
@Injectable()
export class AnnotationState {
  constructor() {}

  @Selector()
  static annotations(state: AnnotationStateModel) {
    return state.annotations
      .filter((a) => !a.thread)
      .sort(timecodeSortingStrategy)
      .map((annotation) => ({
        ...annotation,
        children: state.annotations.filter((a) => a.thread === annotation.id),
      }));
  }

  @Selector()
  static selectedAnnotation(state: AnnotationStateModel) {
    return state.selectedAnnotationId ? state.annotations.find((annotation) => annotation.id === state.selectedAnnotationId) : undefined;
  }

  @Action(SelectAnnotation)
  selectAnnotation(ctx: StateContext<AnnotationStateModel>, {annotationId}: SelectAnnotation) {
    const state = ctx.getState();
    ctx.patchState({
      selectedAnnotationId: annotationId,
    });
  }

  @Action(ResetAnnotations)
  resetAnnotations(ctx: StateContext<AnnotationStateModel>) {
    const state = ctx.getState();
    ctx.patchState({
      annotations: [],
      selectedAnnotationId: undefined,
    });
  }

  @Action(AddAnnotation)
  addAnnotation(ctx: StateContext<AnnotationStateModel>, {annotation}: AddAnnotation) {
    const state = ctx.getState();
    const annotations = [...state.annotations];
    annotations.push(annotation);
    ctx.patchState({
      annotations,
    });
  }

  @Action(DeleteAnnotation)
  deleteAnnotation(ctx: StateContext<AnnotationStateModel>, {annotationId}: DeleteAnnotation) {
    const state = ctx.getState();
    const annotations = [...state.annotations];
    const annotation = annotations.find((a) => a.id === annotationId);
    if (!annotation) {
      return;
    }
    annotations.splice(annotations.indexOf(annotation), 1);
    const children = annotations.filter((a) => a.thread === annotationId);
    for (const child of children) {
      annotations.splice(annotations.indexOf(child), 1);
    }
    ctx.patchState({
      annotations,
    });
    if (ctx.getState().selectedAnnotationId === annotation.id) {
      ctx.patchState({
        selectedAnnotationId: undefined,
      });
    }
  }

  @Action(UpdateAnnotation)
  updateAnnotation(ctx: StateContext<AnnotationStateModel>, {annotationId, updateValue}: UpdateAnnotation) {
    const state = ctx.getState();
    const annotations = [...state.annotations];
    const annotation = annotations.find((t) => t.id === annotationId);
    if (!annotation) {
      return;
    }
    const updatedAnnotation = {
      ...annotation,
      ...updateValue,
    };
    annotations.splice(annotations.indexOf(annotation), 1, updatedAnnotation);
    ctx.patchState({
      annotations,
    });
  }
}
