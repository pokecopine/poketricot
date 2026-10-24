import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ouvrirBase, MIGRATIONS, COLLECTIONS } from "../js/donnees/db.js";

let compteur = 0;
const nomUnique = () => `test-${Date.now()}-${compteur++}`;

test("toutes les collections existent après ouverture", async () => {
  const base = await ouvrirBase({ nom: nomUnique() });
  assert.deepEqual(Array.from(base.db.objectStoreNames).sort(), [...COLLECTIONS].sort());
  base.fermer();
});

test("écrire, relire, modifier, supprimer", async () => {
  const base = await ouvrirBase({ nom: nomUnique() });
  const l = await base.ecrire("laines", { nom: "Mérinos" });
  assert.ok(l.id && l.creeLe && l.modifieLe);
  assert.equal((await base.lire("laines", l.id)).nom, "Mérinos");

  const modifiee = await base.ecrire("laines", { ...l, nom: "Mérinos terracotta" });
  assert.equal(modifiee.id, l.id);
  assert.equal(modifiee.creeLe, l.creeLe);
  assert.equal((await base.lister("laines")).length, 1);
  assert.equal((await base.lire("laines", l.id)).nom, "Mérinos terracotta");

  await base.supprimer("laines", l.id);
  assert.equal(await base.lire("laines", l.id), null);
  base.fermer();
});

test("tout remplacer (import) puis tout relire (export)", async () => {
  const base = await ouvrirBase({ nom: nomUnique() });
  await base.ecrire("laines", { nom: "À effacer" });
  await base.toutRemplacer({
    laines: [{ id: "a", nom: "Alpaga" }],
    aiguilles: [{ id: "b", tailleMm: 4 }],
  });
  const tout = await base.toutLire();
  assert.deepEqual(tout.laines, [{ id: "a", nom: "Alpaga" }]);
  assert.deepEqual(tout.aiguilles, [{ id: "b", tailleMm: 4 }]);
  assert.deepEqual(tout.projets, []);
  base.fermer();
});

test("une migration vers la version 2 garde les données de la version 1", async () => {
  const nom = nomUnique();
  const v1 = await ouvrirBase({ nom });
  await v1.ecrire("laines", { id: "l1", nom: "Mérinos" });
  v1.fermer();

  const migrationV2 = (db, tx) => {
    // Exemple : ajouter un champ à toutes les laines existantes.
    const store = tx.objectStore("laines");
    store.openCursor().onsuccess = (e) => {
      const curseur = e.target.result;
      if (!curseur) return;
      curseur.update({ ...curseur.value, archivee: false });
      curseur.continue();
    };
  };
  const v2 = await ouvrirBase({ nom, migrations: [...MIGRATIONS, migrationV2] });
  assert.equal(v2.db.version, MIGRATIONS.length + 1);
  const l = await v2.lire("laines", "l1");
  assert.equal(l.nom, "Mérinos");
  assert.equal(l.archivee, false);
  v2.fermer();
});
