import {Component} from '@angular/core';
import {OmakasePlayerVideoDetachedComponent} from '../../shared/components/omakase-player/omakase-player-video-detached/omakase-player-video-detached.component';
import {Constants} from '../../shared/constants/constants';

@Component({
  selector: 'app-detached',
  standalone: true,
  imports: [OmakasePlayerVideoDetachedComponent],
  templateUrl: './detached.component.html',
})
export class DetachedComponent {
  OmakasePlayerConstants = Constants;

  constructor() {}
}
