import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss']
})
export class Contact {
  readonly whatsappUrl = 'https://wa.me/573172901206';
  readonly whatsappLabel = '+57 317 290 1206';
  submitted = false;
  invalid = false;
  noBackend = false;

  form = {
    name: '',
    phone: '',
    serviceType: 'reparacion',
    message: '',
    privacy: false
  };

  onSubmit(): void {
    this.invalid = false;
    this.noBackend = false;
    this.submitted = false;

    if (!this.form.name.trim() || !this.form.phone.trim() || !this.form.message.trim() || !this.form.privacy) {
      this.invalid = true;
      return;
    }

    this.submitted = true;
    this.noBackend = true;

    const texto = [
      `Hola, soy ${this.form.name.trim()}.`,
      `Teléfono: ${this.form.phone.trim()}.`,
      `Servicio: ${this.form.serviceType}.`,
      this.form.message.trim()
    ].join(' ');

    window.open(
      `${this.whatsappUrl}?text=${encodeURIComponent(texto)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }
}
