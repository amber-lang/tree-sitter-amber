module.exports = grammar({
    name: "amber",

    extras: $ => [$.comment, /\s/],

    rules: {
        source_file: $ => repeat($._global_statement),

        _global_statement: $ => seq(choice(
            $.import_statement,
            $.function_definition,
            $.main_block,
            $._statement
        ), optional(";")),

        _statement: $ => prec.left(seq(choice(
            $.function_control_flow,
            $.if_cond,
            $.if_chain,
            $.loop_infinite,
            $.for_loop,
            $.while_loop,
            $.loop_control_flow,
            $.variable_init,
            $.variable_assignment,
            $.shebang,
            $.builtin_stmt,
            $._expression
        ), optional(";"))),

        block: $ => choice(
            seq("{", repeat($._statement), "}"),
            seq(":", $._statement)
        ),

        main_block: $ => seq(
            "main",
            optional(seq("(", $.variable, ")")),
            $.block
        ),

        builtin_stmt: $ => seq(choice("cd", "echo", "exit"), $._expression),

        reference: $ => "ref",
        function_parameter_list_item: $ => prec.left(seq(
            optional($.reference),
            $.variable,
            optional(seq(
                ":",
                $.type_name
            )),
            optional(seq(
                "=",
                $._expression
            ))
        )),

        function_parameter_list: $ => seq(
            "(",
            optional(
                seq(
                    $.function_parameter_list_item,
                    repeat(
                        seq(
                            ",",
                            $.function_parameter_list_item
                        )
                    )
                )
            ),
            ")"
        ),

        preprocessor_directive: $ => /\#\[[^]\s]+]/,
        shebang: $ => /\#\!.*/,

        function_definition: $ => seq(
            optional($.preprocessor_directive),
            optional("pub"),
            "fun",
            field("name", $.variable),
            field("parameters", $.function_parameter_list),
            optional(seq(":", $.type_name)),
            field("body", $.block),
        ),

        function_control_flow: $ => seq(choice("return", "fail"), $._expression),

        import_item: $ => seq($.variable, optional(seq("as", $.variable))),
        import_statement: $ => seq(
            optional("pub"),
            "import",
            choice(
                seq(
                    "{",
                    optional(seq($.import_item, repeat(seq(",", $.import_item)))),
                    "}",
                    "from",
                    $.string,
                ),
                seq("*", "from", $.string),
            ),
        ),

        parameter_list: $ => seq(
            "(",
            optional(seq($.variable, repeat(seq(",", $.variable)))),
            ")",
        ),

        subscript: $ => seq("[", $._expression, "]"),
        subscript_expression: $ => prec(5, seq($._expression, $.subscript)),

        variable_init: $ => seq(choice("const", "let"), $.variable_assignment),
        variable_assignment: $ => prec(3, seq(
            $.variable, optional($.subscript),
            choice("=", "+=", "-=", "*=", "/=", "%="),
            $._expression
        )),
        parentheses: $ => prec.left(1, seq("(", $._expression, ")")),

        if_cond: $ => prec.left(seq("if", $._expression, $.block, optional(seq("else", $.block)))),
        if_chain: $ => seq("if", "{", optional(repeat(seq($._expression, $.block))), optional(seq("else", $.block)), "}"),
        if_ternary: $ => prec.left(1, seq($._expression, "then", $._expression, "else", $._expression)),

        loop_infinite: $ => seq("loop", $.block),
        for_loop: $ => seq("for", $.variable, optional(seq(",", $.variable)), "in", $._expression, $.block),
        while_loop: $ => seq("while", $._expression, $.block),
        loop_control_flow: $ => choice("break", "continue"),

        boolean: $ => token(choice("true", "false")),
        null: $ => token("null"),
        number: $ => token(seq(optional(/[-+]/), /\d+(\.\d+)?/)),
        type_name_symbol: $ => choice("Text", "Num", "Bool", "Null"),
        type_name: $ => prec.left(choice(
            $.type_name_symbol,
            seq("[", $.type_name_symbol, "]")
        )),
        status: $ => token("status"),
        array: $ => seq("[", optional(seq($._expression, repeat(seq(",", $._expression)))), "]"),

        function_call: $ => prec(2, seq(
            field("name", $.variable),
            seq(
                "(",
                optional(
                    seq($._expression, repeat(seq(",", $._expression))),
                ),
                ")",
                optional($.handler),
            ),
        )),

        builtin_expr: $ => prec(3, seq(choice('len', 'lines'), '(', $._expression, ')')),

        unop: $ => prec(3, choice(
            seq('-', $._expression),
            seq('not', $._expression),
            seq('unsafe', $._expression),
            seq('trust', $._expression),
            seq('silent', $._expression),
            seq('sudo', $._expression),
            seq('nameof', $._expression),
            seq('len', $._expression),
            seq('lines', $._expression),
        )),

        binop: $ => choice(
            prec.left(2, seq($._expression, '*', $._expression)),
            prec.left(2, seq($._expression, '/', $._expression)),
            prec.left(1, seq($._expression, '+', $._expression)),
            prec.left(1, seq($._expression, '-', $._expression)),
            prec.left(1, seq($._expression, '%', $._expression)),
            prec.left(1, seq($._expression, '>', $._expression)),
            prec.left(1, seq($._expression, '<', $._expression)),
            prec.left(1, seq($._expression, '>=', $._expression)),
            prec.left(1, seq($._expression, '<=', $._expression)),
            prec.left(1, seq($._expression, '==', $._expression)),
            prec.left(1, seq($._expression, '!=', $._expression)),
        ),

        keyword_binop: $ => choice(
            prec.left(2, seq($._expression, 'and', $._expression)),
            prec.left(2, seq($._expression, 'or', $._expression)),
            prec.left(1, seq($._expression, 'is', $._expression)),
            prec.left(1, seq($._expression, 'as', $._expression)),
        ),

        variable: $ => /\w+/,

        string_content: $ => token.immediate(prec(2, /[^\\"{]+/)),
        string: $ => seq(
            '"',
            repeat(
                choice(
                    $.escape_sequence,
                    $.interpolation,
                    $.string_content
                ),
            ),
            '"',
        ),

        handler_failed: $ => seq("failed", $.block),
        handler_succeeded: $ => seq("succeeded", $.block),
        handler_propagation: $ => token("?"),
        handler: $ => choice(
            $.handler_failed,
            $.handler_succeeded,
            $.handler_propagation
        ),

        escape_sequence: $ => token(seq("\\", optional(/./))),
        interpolation: $ => prec(2, seq("{", $._expression, "}")),
        command_content: $ => token.immediate(prec(2, /[^\\${-]+/)),
        command: $ => seq(
            "$",
            repeat(
                choice(
                    $.escape_sequence,
                    $.command_option,
                    $.interpolation,
                    $.command_content,
                ),
            ),
            "$",
            optional($.handler)
        ),
        command_modifier_block: $ => seq(
            repeat1(
                choice(
                    "silent",
                    "trust",
                    "sudo",
                )
            ),
            $.block
        ),

        command_option: $ => token(seq(/-{1,2}/, optional(/[A-Za-z0-9-_]+/))),
        comment: $ => token(seq("//", /.*/)),
        _expression: $ => choice(
            $.boolean,
            $.null,
            $.number,
            $.type_name,
            $.function_call,
            $.if_ternary,
            $.status,
            $.parentheses,
            $.builtin_expr,
            $.unop,
            $.binop,
            $.keyword_binop,
            $.subscript_expression,
            $.command,
            $.command_modifier_block,
            $.array,
            $.string,
            $.variable,
        ),
    },
});
