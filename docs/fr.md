# Bulletins d'avalanche (BERA)

Le bulletin d'estimation du risque d'avalanche (BERA) de Météo-France dans Gladys, pour les 35 massifs français des
Alpes, des Pyrénées et de la Corse : un appareil par massif, avec son niveau de risque de 1 à 5, la tendance du
lendemain, les pentes les plus exposées et l'enneigement. Avec des déclencheurs de scène et un widget de tableau de
bord.

> **Lisez le bulletin complet avant de partir.** Cette intégration en montre un résumé. Elle ne remplace ni le
> bulletin, ni le texte du prévisionniste, ni votre propre évaluation sur le terrain.

Non affiliée à Météo-France.

## Ce que vous obtenez

- **Un appareil par massif** choisi : Mont-Blanc, Belledonne, Aspe-Ossau, Cinto-Rotondo…
- Le **niveau de risque** du jour du bulletin (échelle européenne, 1 Faible à 5 Très fort) et la **tendance** du
  lendemain.
- Le niveau **sous et au-dessus de l'altitude limite**, et cette altitude (0 quand le bulletin donne un seul niveau
  pour tout le massif).
- Les **pentes les plus exposées**, la **date d'émission** et la **fin de validité**.
- La **hauteur de neige** en versant nord et sud à l'altitude la plus haute du tableau du bulletin (2000 m dans les
  Préalpes, en Corse et au Pays basque, 2500 m ailleurs).
- **Bulletin en vigueur** : 1 tant qu'un bulletin couvre l'heure actuelle, 0 sinon (hors saison).
- Deux **déclencheurs de scène** et un **widget de tableau de bord**.

## Prérequis

- Gladys Assistant 5.3.0 ou plus récent.
- Un accès à Internet depuis Gladys. Ni compte ni clé : les bulletins viennent de l'archive ouverte de Météo-France
  sur data.gouv.fr.
- Météo-France émet les bulletins **de début novembre à début juin**, en général vers 16 h pour le lendemain. Hors
  saison, les appareils indiquent « pas de bulletin en vigueur », sans erreur.

## Configuration

### Réglages

| Réglage                            | Défaut   | Rôle                                                                                  |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| Massifs                            | aucun    | Les massifs à suivre, un appareil chacun.                                             |
| Clé d'API Météo-France             | vide     | Facultative : lit les bulletins par l'API DPBRA plutôt que par l'archive.             |
| Langue des noms de fonctionnalités | français | Noms des fonctionnalités des nouveaux appareils, langue de leurs textes et variables. |

Enregistrez, puis ouvrez l'onglet **Découverte** de l'intégration et créez les appareils voulus.

### Facultatif : la clé d'API Météo-France

L'archive ouverte suffit en temps normal. Si elle prend du retard (le bulletin du jour n'apparaît pas le soir), créez
un compte gratuit sur le [portail d'API de Météo-France](https://portail-api.meteofrance.fr), abonnez-vous à l'API
« Bulletin d'estimation du risque d'avalanche » (DPBRA), générez une **clé d'API** et collez-la dans la
configuration. L'intégration interroge alors Météo-France directement, une requête par massif toutes les 30 minutes.
Ce chemin a été développé d'après la documentation de l'API, sans clé : vos retours sont les bienvenus. Le lien vers
le PDF du bulletin n'existe qu'avec l'archive.

## Appareils

| Fonctionnalité                        | Type        | Valeur                                                                    |
| ------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| Risque d'avalanche (1-5)              | nombre      | Niveau le plus haut du jour du bulletin                                   |
| Tendance du risque, lendemain         | nombre      | Niveau prévu pour le jour suivant                                         |
| Risque sous l'altitude limite         | nombre      | Niveau sous l'altitude limite (ou tout le massif)                         |
| Risque au-dessus de l'altitude limite | nombre      | Niveau au-dessus de l'altitude limite (ou tout le massif)                 |
| Altitude limite                       | mètres      | 0 sans altitude limite                                                    |
| Pentes les plus exposées              | texte       | « N, NE, NO », « Toutes orientations » ou « Aucune orientation signalée » |
| Bulletin émis le                      | texte       | Date et heure d'émission                                                  |
| Valable jusqu'au                      | texte       | Fin de validité (18 h le lendemain)                                       |
| Neige versant nord / sud              | centimètres | Hauteur de neige à 2000 ou 2500 m selon le massif                         |
| Bulletin en vigueur                   | oui / non   | 1 tant que le bulletin est valable                                        |

Les niveaux sont des nombres (et non la pastille « risque » de Gladys, qui ne connaît que quatre niveaux) : une
condition de scène comme « risque ≥ 4 » fonctionne. Sans bulletin en vigueur, seul « Bulletin en vigueur » est mis à
jour : les autres valeurs ne sont pas inventées et vieillissent simplement.

## Widget de tableau de bord

**Risque d'avalanche** : sans massif choisi, une ligne par massif suivi (10 au plus) avec son niveau écrit comme le
pictogramme officiel (« 4 · Fort ») et la tendance du lendemain, en vert (1), jaune (2) ou rouge (3 et plus). Avec un
massif choisi : les tuiles du risque et du lendemain, les niveaux sous et au-dessus de l'altitude limite, les pentes,
l'enneigement, la validité, le commentaire du prévisionniste et un bouton vers le PDF du bulletin. Le commentaire et
le bouton ont chacun un réglage pour les masquer.

## Déclencheurs de scène

- **Le risque d'avalanche atteint un niveau** : un nouveau bulletin porte le risque d'un massif au niveau choisi (2 à 5) ou au-delà. Une seule fois, quand le niveau est franchi à la hausse : de 2 à 4, « atteint 3 » et « atteint 4 »
  se déclenchent tous les deux. Variables : massif, niveau, nom du niveau, fin de validité.
- **Nouveau bulletin d'avalanche** : Météo-France émet un nouveau bulletin pour un massif. Variables : massif,
  niveau, nom du niveau, tendance du lendemain, fin de validité, résumé du bulletin (rédigé par Météo-France), lien
  vers le PDF.

Le tout premier bulletin lu après l'installation ne fait que poser la référence : il ne déclenche rien.

## Exemples de scènes

- À 18 h, si le risque de votre massif vaut 4 ou plus, envoyer un message « Risque d'avalanche {{level}} demain ».
- À chaque nouveau bulletin, envoyer son résumé et le lien du PDF au groupe familial.

## Sources, licence et quotas

- Bulletins © Météo-France, [archive des bulletins avalanches](https://www.data.gouv.fr/datasets/archive-des-bulletins-avalanches)
  sur data.gouv.fr, Licence Ouverte 2.0. Lue toutes les 30 minutes : un petit fichier d'index, et le bulletin d'un
  massif seulement quand un nouveau paraît.
- API DPBRA de Météo-France, facultative : une requête par massif toutes les 30 minutes, très loin des 50 requêtes
  par minute du portail.

## Dépannage

- **« Pas de bulletin en vigueur »** en saison, le soir : l'archive peut avoir du retard ; attendez le cycle suivant
  (30 minutes) ou ajoutez une clé d'API (voir plus haut).
- **« Météo-France refuse la clé d'API »** : vérifiez la clé dans la configuration, ou videz-la pour utiliser
  l'archive.
- L'état de connexion indique que les bulletins sont illisibles : data.gouv.fr ou Météo-France est injoignable. Les
  dernières valeurs sont gardées et l'intégration réessaie toutes les 30 minutes.

## Limites

- Développée hors saison : les bulletins de la saison 2025-2026 ont servi aux tests, mais le délai de l'archive en
  pleine saison n'est pas encore mesuré. Vos retours sont les bienvenus.
- Un résumé du bulletin seulement : les textes sur le manteau neigeux, la météo et la qualité de la neige restent
  dans le PDF.
- L'Andorre n'est pas couverte : Météo-France ne publie pas de bulletin pour elle.
