import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../setup';
import { RegistroPage } from '@/pages/RegistroPage';

function renderRegistro() {
  return render(
    <MemoryRouter initialEntries={['/registro']}>
      <RegistroPage />
    </MemoryRouter>,
  );
}

describe('RegistroPage gender catalog', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/courses', () =>
        HttpResponse.json({ data: [] })
      ),
    );
  });

  it('exposes only Femenino and Masculino in the gender selector', async () => {
    renderRegistro();

    const generoSelect = (await screen.findAllByRole('combobox')).find(
      (el) => (el as HTMLSelectElement).name === 'genero',
    ) as HTMLSelectElement | undefined;

    expect(generoSelect).toBeDefined();
    const optionLabels = Array.from(generoSelect!.options).map((o) => o.text);
    const realOptions = optionLabels.filter((label) => label !== 'Selecciona');

    expect(realOptions).toEqual(['Femenino', 'Masculino']);
    expect(realOptions).not.toContain('Otro');
  });
});
