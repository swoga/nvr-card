import { css } from "lit";

export const styles = css`
  .error {
    color: red;
  }
  .dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dt {
    display: flex;
    align-content: center;
    flex-wrap: wrap;
  }
  .dd {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, auto) minmax(0, 2fr));
    margin: 0;
  }
  .toggle {
    padding: 0.6em;
    border: grey;
    border-radius: 50%;
  }
  .toggle.on {
    background-color: green;
  }
  .toggle.off {
    background-color: red;
  }
  .button {
    display: block;
    border: outset 0.2em;
    border-radius: 50%;
    border-color: silver;
    background-color: silver;
    width: 1.4em;
    height: 1.4em;
  }
  .date-selector {
    text-align: center;
    padding: 10px;
  }
  .selected {
    color: var(--sidebar-selected-text-color);
    background-color: rgba(var(--rgb-primary-text-color), 0.12);
  }

  .player {
    overflow: hidden;
  }
  .player:active {
    cursor: move;
  }
  video {
    display: block;
    width: 100%;
    height: 100%;
  }

  .videos {
    display:flex;
    flex-wrap:wrap;
  }

  .videos > div {
    padding: 5px;
    border-color: var(--ha-card-border-color);
    border-style: solid;
    border-width: var(--ha-card-border-width,1px);
    margin-right: 2px;
    margin-bottom: 2px;
    border-radius: 4px;
  }
`;
