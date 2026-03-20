import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FooterComponent } from './components/footer/footer';
import { HeaderComponent } from './components/header/header';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
}
