import Input from "../src/state/Input";
import InputGroup from "../src/state/InputGroup";

() => {
  const g = new InputGroup(new Input<string>(""));
  const test1: Input<string> = g.inputs;
  const test2: string = g.value;
};

() => {
  const g = new InputGroup([new Input("a" as "a"), new Input("b" as "b")]);
  const test1: (Input<"a"> | Input<"b">)[] = g.inputs;
  const test2: ("a" | "b")[] = g.value;
};

() => {
  const g = new InputGroup({
    a: new Input(""),
    b: new Input(0),
    c: new Input(false),
    z: {
      z1: new Input(""),
      z2: new Input(0),
      z3: [new Input(""), new Input(1)],
      z4: [new Input(""), new Input(1), new Input(false)]
    }
  });

  const { value } = g;
  const test1: string = value.a;
  const test2: number = value.b;
  const test3: boolean = value.c;
  const test4: string = value.z.z1;
  const test5: number = value.z.z2;
  const test6: number | string = value.z.z3[0];
  const test7: (number | string | boolean)[] = value.z.z4.map(
    (item: number | string | boolean) => item
  );
};

() => {
  const group1 = new InputGroup({
    foo: new Input<number>(0),
    bar: new Input<boolean>(false)
  });

  const group2 = new InputGroup({
    baz: new Input<string>(""),
    ...group1.inputs
  });

  const group3 = new InputGroup({
    baz: new Input<string>(""),
    group1
  });

  const test1: number = group1.value.foo;
  const test1a: Input<number> = group1.inputs.foo;
  const test2: boolean = group1.value.bar;
  const test2a: Input<boolean> = group1.inputs.bar;

  const test3: string = group2.value.baz;
  const test3a: Input<string> = group2.inputs.baz;
  const test4: number = group2.value.foo;
  const test4a: Input<number> = group2.inputs.foo;
  const test5: boolean = group2.value.bar;
  const test5a: Input<boolean> = group2.inputs.bar;

  const test6: string = group3.value.baz;
  const test6a: Input<string> = group3.inputs.baz;
  const test7: boolean = group3.value.group1.bar;
  const test7a: Input<number> = group3.inputs.group1.foo;
  const test8: number = group3.value.group1.foo;
  const test8a: Input<boolean> = group3.inputs.group1.bar;
};
