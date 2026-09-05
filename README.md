## MAL People Page Enhancer

This Firefox add-on improves the presentation on the website [MyAnimeList](https://myanimelist.net/).
It targets voice actors' list of roles on their people page, e.g. [Rie Kugimiya's page](https://myanimelist.net/people/8/Rie_Kugimiya).

To install it, just download the .xpi at [this link](https://deathburst.github.io/MAL_People_Enhancer_FFaddon/mal-people-page-enhancer-1.1.0.xpi) and accept Firefox pop-up. Future versions should auto-update.

### Description 
The main goal is to avoid repeated entries in the same franchise (every season, movie, OVA, etc.) clogging the list with the same character appearing again and again.
Instead, a new table presents the different appearances grouped with a single line for each character.

Some minor data analysis is also performed:
- count of distinct-character roles.
- character-level classification as Main/Supporting/Mixed role, based on the entry-level data provided by MAL.
- first and latest appearance for a given character.

The new enhanced table is sortable by clicking on the column headers. 
- The "Role" column acts as a filter to remove Supporting and/or Mixed characters from the list.
- Other columns alternate between the classic descending and ascending orders.

### Future features considered:
- character-level franchise/source-title detection -> avoid opening the appearances list just for that
- improved career summary above the table
- interaction with "My List" feature from MAL's default table
- similar treatment to the "Staff position" list to group together theme songs performances for the main franchise
- mobile-compatible version and various UI improvements

### Version history:

- v1: basic table with sortable headers, Character, Favorites, foldable Appearances list, First and Last Appearances.
- v1.1: added character-level role classification and a short career summary above the table. The Role column acts as a filter.
