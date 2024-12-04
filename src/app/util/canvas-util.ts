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

export class CanvasUtil {
  static createCrossedRectClipFunc(width: number, height: number, thickness: number) {
    return (ctx: CanvasRenderingContext2D) => {
      // top left triangle
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width - thickness, 0);
      ctx.lineTo(0, height);
      ctx.closePath();

      // bottom right triangle
      ctx.moveTo(thickness, height);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height);
      ctx.closePath();
    };
  }
}
