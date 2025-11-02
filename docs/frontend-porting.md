# Front-End Porting Guide

The current UI is a mix of Thymeleaf templates and static WebGL pages served from `src/main/resources/templates` and `src/main/resources/static`. The .NET 8 port will deliver the same markup using Blazor Server/Razor views while reusing all existing JavaScript and asset files.

## Guiding Principles
- **Keep every HTML route and file name**: URLs like `/coordenadas-eclipticas` and `/templatewebgl.html` must resolve to the same content so bookmarked links and embedded iframes stay valid.
- **Reuse JavaScript and CSS verbatim**: Copy everything under `src/main/resources/static` into `wwwroot/` and update references to use the same relative paths.
- **Translate Thymeleaf expressions to Blazor**: Replace constructs such as `th:text="${conteudo}"` with Blazor data bindings (`@Conteudo`). Pages that were static HTML remain static.
- **Avoid SPA rewrites**: Keep a server-rendered Blazor application with per-page components so we do not have to rearchitect the WebGL tooling.

## Project Layout

```
ASTRO.Net/
 ├─ Astro.Web/                 # ASP.NET Core 8 project
 │   ├─ Pages/
 │   │   ├─ _Host.cshtml       # Blazor Server host page
 │   │   ├─ Index.razor        # Main landing page (mainpage.html)
 │   │   ├─ TemplateWebgl.razor
 │   │   └─ Webgl/
 │   │       ├─ AnguloHorario.razor
 │   │       ├─ ... (one per conteudo.html)
 │   ├─ Shared/
 │   │   └─ MainLayout.razor   # Optional layout replicating template.html chrome
 │   └─ wwwroot/
 │       └─ js/, css/, lib/, imgs/, webgl assets copied verbatim
```

## Templates and Views

### `mainpage.html`, `template-ferramenta.html`, `templatewebgl.html`, `creditos.html`, etc.
- Create Blazor pages using the same HTML markup. For example, `mainpage.html` becomes `Pages/Index.razor` with the content pasted into a `<PageTitle>` / markup block.
- Where Thymeleaf injected data (`th:text`, `th:href`), expose properties in the page’s `@code` block. Example for the WebGL wrapper:
  ```razor
  @page "/angulo-horario"
  @inherits TemplateWebglPage

  @code {
      protected override string Conteudo => "angulo-horario";
  }
  ```
  `TemplateWebglPage` is a base component that renders the shared `templatewebgl.html` structure and outputs `Conteudo` wherever Thymeleaf used `${conteudo}`.
- Keep layout and scripts identical. Put shared `<head>` markup into `Shared/HeadContent.razor` or a layout component to avoid duplication.

### Individual WebGL Pages (`templates/webgl/**/conteudo.html`)
- These pages are currently included by `templatewebgl.html`. Convert each `conteudo.html` file into a Blazor component under `Pages/Webgl/`. Inject it inside the wrapper using:
  ```razor
  @if (!string.IsNullOrEmpty(Conteudo))
  {
      <DynamicComponent Type="ResolveComponentType(Conteudo)" />
  }
  ```
- Create a mapping method (`ResolveComponentType`) returning the corresponding `.razor` component type. Each component simply contains the HTML snippet from its original file with no C# logic.
- Preserve IDs, data attributes, and script hooks so the existing JavaScript continues to manipulate the DOM as before.

### `quiz.html`, `posicao-sol.html`, `template-ferramenta.html`, etc.
- For templates that already serve full pages, create dedicated `.razor` pages with matching routes (`@page "/quiz"`). No interactivity changes are required; only replace Thymeleaf-specific attributes.

## Static Assets

- Copy everything under `src/main/resources/static` into `wwwroot`. The relative references inside HTML (e.g., `<script src="js/jquery.min.js">`) remain valid when the pages live under Blazor’s root.
- Update the `.csproj` to include the static files:
  ```xml
  <ItemGroup>
      <Content Include="wwwroot\**\*" CopyToOutputDirectory="PreserveNewest" />
  </ItemGroup>
  ```
- Retain Git submodules (e.g., `lib/on-daed-js`, `lib/on-physics`) by pulling them into the new repo or referencing them as npm packages if desired. The quickest path is to vendor the same directories under `wwwroot/lib`.

## Routing

- Define each page’s `@page` directive to match the original route defined in `SiteController`. For example, `@page "/coordenadas-eclipticas"`.
- For the root controller actions that returned `templatewebgl` with different `conteudo`, provide a single Razor Page base class that sets the `Conteudo` value and renders the same layout. This preserves the route map without altering JavaScript expectations.
- Pages that relied on query parameters should parse them using `NavigationManager` or `[Parameter]` bindings to keep behaviour identical.

## Layout & SEO

- Implement `_Host.cshtml` to include the `<head>` metadata exactly as `templatewebgl.html`, including OpenGraph tags and GA snippet. Ensure the generated HTML matches to avoid social sharing regressions.
- Use `<head>` sections or `IHtmlContent` injection to set dynamic titles (`Astro - {Conteudo}`) replicating Thymeleaf’s `th:text` expression.

## Forms & Downloads

- The CSV export form posts to `/csv`. Ensure the Blazor pages still submit via standard HTML forms (no need to convert to Blazor event handlers). Blazor Server can coexist with standard POST forms by using `<form method="post" action="/csv">`.
- Where JavaScript binds events (`.bind('click', ...)` in the templates), keep the markup the same so the event delegation still works.

## Progressive Enhancement

- The current code base relies on jQuery plugins and Bootstrap 3. Do not upgrade libraries as part of the port; doing so risks breaking WebGL interactions.
- Blazor Server’s real-time component updates are optional; treat each page as largely static markup that defers to the existing JS for dynamic behaviour.

## Testing Strategy

- Capture representative HTML output from the Java application and compare it with the Blazor-rendered markup using integration tests (e.g., Playwright snapshots). Focus on critical elements: titles, script tags, container IDs, and form field names.
- Run the existing front-end smoke tests (if any) or manual WebGL flows against the .NET app to ensure the JavaScript assets behave identically.

Following this approach allows us to port the templates with minimal risk while meeting the directive to keep the JavaScript untouched and routes stable.
