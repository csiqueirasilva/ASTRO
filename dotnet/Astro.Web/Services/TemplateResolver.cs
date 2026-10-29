using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Extensions.FileProviders;
using HtmlAgilityPack;

namespace Astro.Web.Services;

public sealed class TemplateResolver
{
    private static readonly Regex DirectiveRegex = new(
        @"<(?<tag>[A-Za-z0-9:_-]+)(?<before>[^>]*)\s+th:(?<kind>replace|include)\s*=\s*(?<q>['""])(?<target>(?:(?!\k<q>)[\s\S])+)\k<q>(?<after>[^>]*)>(?<body>[\s\S]*?)</\k<tag>>",
        RegexOptions.Compiled | RegexOptions.Singleline);

    private static readonly Regex RemoveThAttributeRegex = new(
        @"\s+th:[a-zA-Z0-9-]+\s*=\s*(?<q>['""])(?:(?!\k<q>)[\s\S])*\k<q>",
        RegexOptions.Compiled);

    private static readonly Regex FragmentCallRegex = new(
        @"^(?<name>[^(]+?)\s*\((?<args>[\s\S]*)\)$",
        RegexOptions.Compiled);

    private static readonly Regex ArgumentRegex = new(@"'(?<literal>[^']*)'|\$\{(?<variable>\w+)\}", RegexOptions.Compiled);

    private static readonly Regex ThTextRegex = new(
        @"<(?<tag>[A-Za-z0-9:_-]+)(?<before>[^>]*?)\s+th:text\s*=\s*(?<q>['""])\$\{(?<param>\w+)\}\k<q>(?<after>[^>]*)>[\s\S]*?</\k<tag>>",
        RegexOptions.Compiled);

    private readonly IFileProvider _fileProvider;
    private readonly ConcurrentDictionary<string, string> _fileCache = new(StringComparer.OrdinalIgnoreCase);

    public TemplateResolver(IFileProvider fileProvider)
    {
        _fileProvider = fileProvider;
    }

    public string Resolve(string relativePath)
    {
        return Resolve(relativePath, new HashSet<string>(StringComparer.OrdinalIgnoreCase));
    }

    public string ResolveExpression(string expression)
    {
        return ResolveTarget(expression.Trim(), new HashSet<string>(StringComparer.OrdinalIgnoreCase));
    }

    private string Resolve(string relativePath, HashSet<string> stack)
    {
        var normalized = NormalizePath(relativePath);
        if (!stack.Add(normalized))
        {
            throw new InvalidOperationException($"Cyclic template reference detected for '{normalized}'.");
        }

        try
        {
            var content = LoadFile(normalized);
            if (string.IsNullOrEmpty(content))
            {
                return string.Empty;
            }

            content = ProcessDirectives(content, stack);
            return RemoveThAttributeRegex.Replace(content, string.Empty);
        }
        finally
        {
            stack.Remove(normalized);
        }
    }

    private string ProcessDirectives(string content, HashSet<string> stack, IReadOnlyDictionary<string, string>? scope = null)
    {
        return DirectiveRegex.Replace(content, match =>
        {
            var kind = match.Groups["kind"].Value;
            var target = match.Groups["target"].Value.Trim();
            var tagName = match.Groups["tag"].Value;
            var before = match.Groups["before"].Value;
            var after = match.Groups["after"].Value;

            var resolved = ResolveTarget(target, stack, kind.Equals("include", StringComparison.OrdinalIgnoreCase), scope);

            if (string.Equals(kind, "replace", StringComparison.OrdinalIgnoreCase))
            {
                return resolved;
            }

            var startTag = $"<{tagName}{before}{after}>";
            return startTag + resolved + $"</{tagName}>";
        });
    }

    private string ResolveTarget(string target, HashSet<string> stack, bool contentOnly = false, IReadOnlyDictionary<string, string>? scope = null)
    {
        var separator = target.IndexOf("::", StringComparison.Ordinal);
        if (separator < 0)
        {
            return Resolve(target, stack);
        }

        var path = NormalizePath(target[..separator]);
        var fragment = target[(separator + 2)..].Trim();
        var arguments = new List<string>();

        var call = FragmentCallRegex.Match(fragment);
        if (call.Success)
        {
            fragment = call.Groups["name"].Value.Trim();
            // Thymeleaf turns line breaks inside string literals into spaces.
            arguments = ArgumentRegex.Matches(call.Groups["args"].Value)
                .Select(m => m.Groups["literal"].Success
                    ? Regex.Replace(m.Groups["literal"].Value, @"\r?\n", " ")
                    : scope?.GetValueOrDefault(m.Groups["variable"].Value) ?? string.Empty)
                .ToList();
        }

        if (!stack.Add(path))
        {
            throw new InvalidOperationException($"Cyclic template reference detected for '{path}'.");
        }

        try
        {
            var found = FindFragment(LoadFile(path), fragment, contentOnly);
            if (found is null)
            {
                return string.Empty;
            }

            var (markup, parameters) = found.Value;
            var bindings = parameters.Zip(arguments).ToDictionary(p => p.First, p => p.Second);
            markup = ApplyParameters(markup, bindings);
            markup = ProcessDirectives(markup, stack, bindings);
            return RemoveThAttributeRegex.Replace(markup, string.Empty);
        }
        finally
        {
            stack.Remove(path);
        }
    }

    private static string ApplyParameters(string markup, IReadOnlyDictionary<string, string> bindings)
    {
        // th:text='${param}' replaces the element body with the escaped value.
        return ThTextRegex.Replace(markup, match =>
        {
            if (!bindings.TryGetValue(match.Groups["param"].Value, out var value))
            {
                return match.Value;
            }

            var tag = match.Groups["tag"].Value;
            var escaped = value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
            return $"<{tag}{match.Groups["before"].Value}{match.Groups["after"].Value}>{escaped}</{tag}>";
        });
    }

    private static (string Markup, string[] Parameters)? FindFragment(string content, string fragmentName, bool contentOnly)
    {
        var doc = new HtmlDocument();
        doc.LoadHtml(content);

        foreach (var node in doc.DocumentNode.Descendants().Where(n => n.NodeType == HtmlNodeType.Element))
        {
            var attr = node.Attributes.FirstOrDefault(a => a.Name.Equals("th:fragment", StringComparison.OrdinalIgnoreCase));
            if (attr is null)
            {
                continue;
            }

            var fragmentId = attr.Value.Trim();
            var parameters = Array.Empty<string>();
            var parenIndex = fragmentId.IndexOf('(');
            if (parenIndex >= 0)
            {
                parameters = fragmentId[(parenIndex + 1)..].TrimEnd(')', ' ')
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                fragmentId = fragmentId[..parenIndex].Trim();
            }

            if (!string.Equals(fragmentId, fragmentName, StringComparison.Ordinal))
            {
                continue;
            }

            return (contentOnly ? node.InnerHtml : node.OuterHtml, parameters);
        }

        return null;
    }

    private string LoadFile(string path)
    {
        return _fileCache.GetOrAdd(path, key =>
        {
            var info = _fileProvider.GetFileInfo(key);
            if (!info.Exists)
            {
                return string.Empty;
            }

            using var stream = info.CreateReadStream();
            using var reader = new StreamReader(stream);
            return reader.ReadToEnd();
        });
    }

    private static string NormalizePath(string path)
    {
        var trimmed = path.Trim();
        if (trimmed.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed.Replace('\\', '/');
        }

        return trimmed.Replace('\\', '/') + ".html";
    }
}
