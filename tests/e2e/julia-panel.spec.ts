import { expect, test, type Page } from '@playwright/test';

test.describe('Julia surfaces', () => {
  test('activates the linked Julia panel after completing the First flight navigation step', async ({ page }) => {
    await page.goto('/');

    const formulaSelect = page.locator('.control-panel__section').filter({ hasText: 'Formula' }).locator('select');
    await formulaSelect.selectOption('tricorn');
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await page.getByRole('button', { name: 'Start first flight' }).click();
    await expect(formulaSelect).toHaveValue('mandelbrot');

    const mainCanvas = page.getByTestId('main-canvas');
    const box = await mainCanvas.boundingBox();
    if (!box) {
      throw new Error('Main canvas is not available for the First flight regression.');
    }

    await page.mouse.move(box.x + 200, box.y + 180);
    await page.mouse.down();
    await page.mouse.move(box.x + 230, box.y + 180, { steps: 3 });
    await page.mouse.up();
    await expect(page.getByTestId('first-flight')).toContainText('Open a Julia world');

    await mainCanvas.click({ position: { x: 340, y: 220 } });
    await expect(page.getByTestId('julia-view')).toHaveAttribute('data-rendering-state', 'active');
    await expect(page.getByTestId('first-flight')).toContainText('Tune the seed');

    await page.getByLabel('Linked Julia real').fill('-0.42');
    await expect(page.getByTestId('first-flight')).toContainText('Open flight controls');
    const settingsButton = page.getByRole('button', { name: 'Settings', exact: true });
    await expect(settingsButton).toHaveClass(/is-first-flight-target/);
    await settingsButton.click();

    await expect(page.getByTestId('first-flight')).toContainText('Review your controls');
    await expect(page.getByTestId('settings-controls')).toHaveClass(/is-first-flight-target/);
    await page.getByRole('button', { name: 'Continue flight' }).click();

    await expect(page.getByTestId('first-flight')).toContainText('Keep the discovery');
    const quickSave = page.getByRole('button', { name: 'Quick save' });
    await expect(quickSave).toHaveClass(/is-first-flight-target/);
    await quickSave.click();
    await expect(page.getByTestId('first-flight')).toContainText('Flight complete');
  });

  test('adjusts parameters with hotkeys when Julia is the primary surface', async ({ page }) => {
    await page.goto('/');

    await page.locator('.control-panel__section').filter({ hasText: 'Formula' }).locator('select').selectOption('julia');
    const juliaReal = page.getByLabel('Julia real');
    const juliaImaginary = page.getByLabel('Julia imaginary');

    await page.getByTestId('main-canvas').click({ position: { x: 120, y: 120 } });
    await expect(page.getByTestId('main-view').getByText('Keyboard navigation active')).toBeVisible();

    await page.keyboard.press('j');
    await page.keyboard.press('i');
    await expect(juliaReal).toHaveValue('-0.801');
    await expect(juliaImaginary).toHaveValue('0.157');

    await page.keyboard.down('Shift');
    await page.keyboard.press('l');
    await page.keyboard.press('k');
    await page.keyboard.up('Shift');
    await expect.poll(async () => Number(await juliaReal.inputValue())).toBeCloseTo(-0.8009);
    await expect.poll(async () => Number(await juliaImaginary.inputValue())).toBeCloseTo(0.1569);
  });

  test('continues adjusting Julia parameters while a key repeats', async ({ page }) => {
    await page.goto('/');

    await page.locator('.control-panel__section').filter({ hasText: 'Formula' }).locator('select').selectOption('julia');
    const juliaReal = page.getByLabel('Julia real');
    await page.getByTestId('main-canvas').click({ position: { x: 120, y: 120 } });

    await page.keyboard.down('j');
    await page.keyboard.down('j');
    await page.keyboard.up('j');

    await expect(juliaReal).toHaveValue('-0.802');
  });

  test('starts idle and activates after choosing a Mandelbrot point', async ({ page }) => {
    await page.goto('/');

    const juliaView = page.getByTestId('julia-view');
    await expect(juliaView).toHaveAttribute('data-rendering-state', 'idle');
    await expect(page.getByTestId('julia-placeholder')).toContainText('Choose a Mandelbrot seed');

    await page.getByTestId('main-canvas').click({
      position: { x: 340, y: 220 },
    });

    await expect(juliaView).toHaveAttribute('data-rendering-state', 'active');
    await expect(page.getByTestId('julia-placeholder')).toHaveCount(0);
    await expect(page.getByText('Secondary panel seeded from the main surface')).toBeVisible();
    await expect(page.getByText('Latest Julia seed')).toBeVisible();
    await expect.poll(async () => page.getByTestId('julia-canvas').evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext('2d');
      if (!context) {
        return true;
      }

      const pixels = context.getImageData(0, 0, Math.min(canvas.width, 16), Math.min(canvas.height, 16)).data;
      return pixels.some((_, index) => index % 4 === 3 && pixels[index] === 255);
    }), { timeout: 10_000 }).toBe(true);

    await page.getByText('Linked Julia parameters').click();
    const linkedReal = page.getByLabel('Linked Julia real');
    await linkedReal.fill('-0.42');
    await expect(linkedReal).toHaveValue('-0.42');

    await page.getByRole('button', { name: 'Settings' }).click();
    const realDecreaseBinding = page.locator('.control-panel__binding-row').filter({ hasText: 'Julia real -' });
    await realDecreaseBinding.getByRole('button').click();
    await page.keyboard.press('u');
    await expect(realDecreaseBinding.getByRole('button')).toHaveText('U');
    await expect(linkedReal).toHaveValue('-0.42');
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    await page.getByTestId('julia-canvas').click({ position: { x: 120, y: 120 } });
    await expect(juliaView.getByText('Keyboard navigation active')).toBeVisible();
    await page.keyboard.down('u');
    await page.keyboard.up('u');
    await expect(linkedReal).toHaveValue('-0.421');

    await page.keyboard.down('Shift');
    await page.keyboard.down('u');
    await page.keyboard.up('u');
    await page.keyboard.up('Shift');
    await expect(linkedReal).toHaveValue('-0.4211');
  });

  test('supports Julia-side focus after the linked view activates', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('main-canvas').click({
      position: { x: 340, y: 220 },
    });

    await page.getByTestId('julia-canvas').click({
      position: { x: 120, y: 120 },
    });

    await expect(page.getByTestId('julia-view').getByText('Keyboard navigation active')).toBeVisible();
  });

  test('applies a smaller keyboard zoom while the precision modifier is held', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('main-canvas').click({ position: { x: 340, y: 220 } });
    await page.getByTestId('julia-canvas').click({ position: { x: 120, y: 120 } });

    const initialScale = await readJuliaScale(page);
    await page.keyboard.down('q');
    await page.waitForTimeout(250);
    await page.keyboard.up('q');
    const regularZoomScale = await readJuliaScale(page);

    await page.reload();
    await page.getByTestId('main-canvas').click({ position: { x: 340, y: 220 } });
    await page.getByTestId('julia-canvas').click({ position: { x: 120, y: 120 } });
    await page.keyboard.down('Shift');
    await page.keyboard.down('q');
    await page.waitForTimeout(250);
    await page.keyboard.up('q');
    await page.keyboard.up('Shift');
    const precisionZoomScale = await readJuliaScale(page);

    expect(regularZoomScale).toBeLessThan(precisionZoomScale);
    expect(precisionZoomScale).toBeLessThan(initialScale);
  });
});

async function readJuliaScale(page: Page): Promise<number> {
  const text = await page.getByTestId('julia-view').locator('.render-view__meta span').nth(2).textContent();
  return Number(text?.replace('Scale ', ''));
}
