import { ChangeDetectionStrategy, Component } from '@angular/core';
import { signal } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {

  modoOscuroActivo = signal(false);

toggleModoOscuro() {
  this.modoOscuroActivo.set(!this.modoOscuroActivo());
  if (this.modoOscuroActivo()) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}
}
