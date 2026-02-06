/**
 * Test Script: Add Coins
 *
 * Fügt Test-Coins zum aktuellen Benutzer hinzu.
 * Ausführen in der Browser-Console (F12 → Console) nach dem Login.
 *
 * Usage:
 *   1. Öffne http://localhost:4200 und logge dich ein
 *   2. Öffne DevTools (F12) → Console
 *   3. Kopiere und führe dieses Script aus
 */

(function addTestCoins(amount = 50000) {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('schlaufuchs-coins-'));

  if (keys.length === 0) {
    console.error('❌ Keine Coin-Daten gefunden. Bist du eingeloggt?');
    return;
  }

  keys.forEach(key => {
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    const newBalance = {
      balance: (current.balance || 0) + amount,
      total_earned: (current.total_earned || 0) + amount,
      total_spent: current.total_spent || 0,
    };
    localStorage.setItem(key, JSON.stringify(newBalance));
    console.log(`✅ ${amount} Coins hinzugefügt. Neuer Stand: ${newBalance.balance}`);
  });

  console.log('🔄 Seite wird neu geladen...');
  setTimeout(() => location.reload(), 500);
})(500);
