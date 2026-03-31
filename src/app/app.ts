import { Component } from '@angular/core';

import { MosSliderComponent } from './slider';
import { MosSlideDirective } from './slide.directive';


@Component({
  selector: 'app-root',
  imports: [MosSliderComponent, MosSlideDirective],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
