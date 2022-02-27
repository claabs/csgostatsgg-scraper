const setup = (): void => {
  process.env.SA_SHOW_BROWSER = 'false';
  // process.env.SA_SHOW_BROWSER = 'true';
  process.env.SA_DISABLE_DEVTOOLS = 'true';
  process.env.SA_SHOW_REPLAY = 'false';
};

export default setup;
