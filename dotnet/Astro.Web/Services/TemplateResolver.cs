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
        @"<(?<tag>[A-Za-z0-9:_-]+)(?<before>[^>]*)\s+th:(?<kind>replace|include)\s*=\s*['""](?<target>[^'""]+)['""](?<after>[^>]*)>(?<body>[\s\S]*?)</\k<tag>>",
        RegexOptions.Compiled | RegexOptions.Singleline);

    private static readonly Regex FragmentRegex = new(
        @"<(?<tag>[A-Za-z0-9:_-]+)(?<before>[^>]*)\s+th:fragment\s*=\s*['""](?<name>[^'""]+)['""](?<after>[^>]*)>(?<body>[\s\S]*?)</\k<tag>>",
        RegexOptions.Compiled | RegexOptions.Singleline);

    private static readonly Regex RemoveThAttributeRegex = new(
        @"\s+th:[a-zA-Z0-9-]+\s*=\s*['""][^'""]*['""]",
        RegexOptions.Compiled);

    private readonly IFileProvider _fileProvider;
    private readonly ConcurrentDictionary<string, string> _fileCache = new(StringComparer.OrdinalIgnoreCase);

    public TemplateResolver(IFileProvider fileProvider)
    {
        _fileProvider = fileProvider;
    }

    public string Resolve(string relativePath)
    {
        return Resolve(relativePath, new HashSet<string>(StringComparer.OrdinalIgnoreCase), preserveThAttributes: false);
    }

    public string ResolveExpression(string expression)
    {
        return ResolveTarget(expression.Trim(), new HashSet<string>(StringComparer.OrdinalIgnoreCase));
    }

    private string Resolve(string relativePath, HashSet<string> stack, bool preserveThAttributes)
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
            if (!preserveThAttributes)
            {
                content = RemoveThAttributeRegex.Replace(content, string.Empty);
            }
            return content;
        }
        finally
        {
            stack.Remove(normalized);
        }
    }

    private string ProcessDirectives(string content, HashSet<string> stack)
    {
        return DirectiveRegex.Replace(content, match =>
        {
            var kind = match.Groups["kind"].Value;
            var target = match.Groups["target"].Value.Trim();
            var tagName = match.Groups["tag"].Value;
            var before = match.Groups["before"].Value;
            var after = match.Groups["after"].Value;

            var resolved = ResolveTarget(target, stack, kind.Equals("include", StringComparison.OrdinalIgnoreCase));

            if (string.Equals(kind, "replace", StringComparison.OrdinalIgnoreCase))
            {
                return resolved;
            }

            var startTag = $"<{tagName}{before}{after}>";
            return startTag + resolved + $"</{tagName}>";
        });
    }

    private string ResolveTarget(string target, HashSet<string> stack, bool contentOnly = false)
    {
        var path = target;
        string? fragment = null;

        var separator = target.IndexOf("::", StringComparison.Ordinal);
        if (separator >= 0)
        {
            path = target[..separator].Trim();
            fragment = target[(separator + 2)..].Trim();
        }

        var resolved = Resolve(path, stack, preserveThAttributes: fragment is not null);

        if (fragment is null)
        {
            return resolved;
        }

        var fragmentMarkup = FindFragment(resolved, fragment, contentOnly);
        return fragmentMarkup is null ? string.Empty : RemoveThAttributeRegex.Replace(fragmentMarkup, string.Empty);
    }

    private static string? FindFragment(string content, string fragmentName, bool contentOnly)
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
            var parenIndex = fragmentId.IndexOf('(');
            if (parenIndex >= 0)
            {
                fragmentId = fragmentId[..parenIndex];
            }

            if (!string.Equals(fragmentId, fragmentName, StringComparison.Ordinal))
            {
                continue;
            }

            var markup = contentOnly ? node.InnerHtml : node.OuterHtml;
            return markup;
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
