# Refactoring — smells

Cite `smell:<slug>`. Load this file + catalog/foundations.

---

# Smells â€” Bloaters


> Bloaters â€” methods/classes/params grew huge over time. Hard to work with.

## Long Method (`long-method`)

| | |
| --- | --- |
| **signs** | A method contains too many lines of code. Generally, any method longer than ten lines should make you start asking questions. |
| **why** | Like the Hotel California, something is always being added to a method but nothing is ever taken out. Since itâ€™s easier to write code than to read it, this â€œsmellâ€ remains unnoticed until the method turns into an ugly, oversized beast. Mentally, itâ€™s often harder to create a new method than to add to an existing one:â€¦ |
| **treat** | As a rule of thumb, if you feel the need to comment on something inside a method, you should take this code and put it in a new method. Even a single line can and should be split off into a separate method, if it requires explanations. And if the method has a descriptive name, nobody will need to look at the code to see what it does. To reduce the length of a method body, use Extract Method . If local variables and parameters interfere with extracting a method, use Replaceâ€¦ |
| **â†’ techs** | `decompose-conditional` Â· `extract-method` Â· `introduce-parameter-object` Â· `preserve-whole-object` Â· `replace-method-with-method-object` Â· `replace-temp-with-query` |

## Large Class (`large-class`)

| | |
| --- | --- |
| **signs** | A class contains many fields/methods/lines of code. |
| **why** | Classes usually start small. But over time, they get bloated as the program grows. As is the case with long methods as well, programmers usually find it mentally less taxing to place a new feature in an existing class than to create a new class for the feature. |
| **treat** | When a class is wearing too many (functional) hats, think about splitting it up: Extract Class helps if part of the behavior of the large class can be spun off into a separate component. Extract Subclass helps if part of the behavior of the large class can be implemented in different ways or is used in rare cases. Extract Interface helps if itâ€™s necessary to have a list of the operations and behaviors that the client can use. If a large class is responsible for theâ€¦ |
| **â†’ techs** | `duplicate-observed-data` Â· `extract-class` Â· `extract-interface` Â· `extract-subclass` |

## Primitive Obsession (`primitive-obsession`)

| | |
| --- | --- |
| **signs** | Use of primitives instead of small objects for simple tasks (such as currency, ranges, special strings for phone numbers, etc.) Use of constants for coding information (such as a constant USER_ADMIN_ROLE = 1 for referring to users with administrator rights.) Use of stringâ€¦ |
| **why** | Like most other smells, primitive obsessions are born in moments of weakness. â€œJust a field for storing some data!â€ the programmer said. Creating a primitive field is so much easier than making a whole new class, right? And so it was done. Then another field was needed and added in the same way. Lo and behold, theâ€¦ |
| **treat** | If you have a large variety of primitive fields, it may be possible to logically group some of them into their own class. Even better, move the behavior associated with this data into the class too. For this task, try Replace Data Value with Object . If the values of primitive fields are used in method parameters, go with Introduce Parameter Object or Preserve Whole Object . When complicated data is coded in variables, use Replace Type Code with Class , Replace Type Codeâ€¦ |
| **â†’ techs** | `introduce-parameter-object` Â· `preserve-whole-object` Â· `replace-array-with-object` Â· `replace-data-value-with-object` Â· `replace-type-code-with-class` Â· `replace-type-code-with-subclasses` |

## Long Parameter List (`long-parameter-list`)

| | |
| --- | --- |
| **signs** | More than three or four parameters for a method. |
| **why** | A long list of parameters might happen after several types of algorithms are merged in a single method. A long list may have been created to control which algorithm will be run and how. Long parameter lists may also be the byproduct of efforts to make classes more independent of each other. For example, the code forâ€¦ |
| **treat** | Check what values are passed to parameters. If some of the arguments are just results of method calls of another object, use Replace Parameter with Method Call . This object can be placed in the field of its own class or passed as a method parameter. Instead of passing a group of data received from another object as parameters, pass the object itself to the method, by using Preserve Whole Object . But if these parameters are coming from different sources, you can pass themâ€¦ |
| **â†’ techs** | `introduce-parameter-object` Â· `preserve-whole-object` Â· `replace-parameter-with-method-call` |

## Data Clumps (`data-clumps`)

| | |
| --- | --- |
| **signs** | Sometimes different parts of the code contain identical groups of variables (such as parameters for connecting to a database). These clumps should be turned into their own classes. |
| **why** | Often these data groups are due to poor program structure or "copypasta programmingâ€. If you want to make sure whether or not some data is a data clump, just delete one of the data values and see whether the other values still make sense. If this isnâ€™t the case, this is a good sign that this group of variables shouldâ€¦ |
| **treat** | If repeating data comprises the fields of a class, use Extract Class to move the fields to their own class. If the same data clumps are passed in the parameters of methods, use Introduce Parameter Object to set them off as a class. If some of the data is passed to other methods, think about passing the entire data object to the method instead of just individual fields. Preserve Whole Object will help with this. Look at the code used by these fields. It may be a good idea toâ€¦ |
| **â†’ techs** | `extract-class` Â· `introduce-parameter-object` Â· `preserve-whole-object` |

---

# Smells â€” OO Abusers


> OO Abusers â€” incomplete/incorrect OOP (switch piles, refused inheritance, mismatched APIs).

## Switch Statements (`switch-statements`)

| | |
| --- | --- |
| **signs** | You have a complex switch operator or sequence of if statements. |
| **why** | Relatively rare use of switch and case operators is one of the hallmarks of object-oriented code. Often code for a single switch can be scattered in different places in the program. When a new condition is added, you have to find all the switch code and modify it. As a rule of thumb, when you see switch you shouldâ€¦ |
| **treat** | To isolate switch and put it in the right class, you may need Extract Method and then Move Method . If a switch is based on type code, such as when the programâ€™s runtime mode is switched, use Replace Type Code with Subclasses or Replace Type Code with State/Strategy . After specifying the inheritance structure, use Replace Conditional with Polymorphism . If there arenâ€™t too many conditions in the operator and they all call same method with different parameters, polymorphismâ€¦ |
| **â†’ techs** | `extract-method` Â· `introduce-null-object` Â· `move-method` Â· `replace-conditional-with-polymorphism` Â· `replace-parameter-with-explicit-methods` Â· `replace-type-code-with-subclasses` |

## Temporary Field (`temporary-field`)

| | |
| --- | --- |
| **signs** | Temporary fields get their values (and thus are needed by objects) only under certain circumstances. Outside of these circumstances, theyâ€™re empty. |
| **why** | Oftentimes, temporary fields are created for use in an algorithm that requires a large amount of inputs. So instead of creating a large number of parameters in the method, the programmer decides to create fields for this data in the class. These fields are used only in the algorithm and go unused the rest of theâ€¦ |
| **treat** | Temporary fields and all code operating on them can be put in a separate class via Extract Class . In other words, youâ€™re creating a method object, achieving the same result as if you would perform Replace Method with Method Object . Introduce Null Object and integrate it in place of the conditional code which was used to check the temporary field values for existence. |
| **â†’ techs** | `extract-class` Â· `introduce-null-object` Â· `replace-method-with-method-object` |

## Refused Bequest (`refused-bequest`)

| | |
| --- | --- |
| **signs** | If a subclass uses only some of the methods and properties inherited from its parents, the hierarchy is off-kilter. The unneeded methods may simply go unused or be redefined and give off exceptions. |
| **why** | Someone was motivated to create inheritance between classes only by the desire to reuse the code in a superclass. But the superclass and subclass are completely different. |
| **treat** | If inheritance makes no sense and the subclass really does have nothing in common with the superclass, eliminate inheritance in favor of Replace Inheritance with Delegation . If inheritance is appropriate, get rid of unneeded fields and methods in the subclass. Extract all fields and methods needed by the subclass from the parent class, put them in a new superclass, and set both classes to inherit from it ( Extract Superclass ). |
| **â†’ techs** | `extract-superclass` Â· `replace-inheritance-with-delegation` |

## Alternative Classes With Different Interfaces (`alternative-classes-with-different-interfaces`)

| | |
| --- | --- |
| **signs** | Two classes perform identical functions but have different method names. |
| **why** | The programmer who created one of the classes probably didnâ€™t know that a functionally equivalent class already existed. |
| **treat** | Try to put the interface of classes in terms of a common denominator: Rename Method s to make them identical in all alternative classes. Move Method , Add Parameter and Parameterize Method to make the signature and implementation of methods the same. If only part of the functionality of the classes is duplicated, try using Extract Superclass . In this case, the existing classes will become subclasses. After you have determined which treatment method to use and implementedâ€¦ |
| **â†’ techs** | `add-parameter` Â· `extract-superclass` Â· `move-method` Â· `parameterize-method` Â· `rename-method` |

---

# Smells â€” Change Preventers


> Change Preventers â€” one change forces many edits elsewhere. Dev gets expensive.

## Divergent Change (`divergent-change`)

| | |
| --- | --- |
| **signs** | You find yourself having to change many unrelated methods when you make changes to a class. For example, when adding a new product type you have to change the methods for finding, displaying, and ordering products. |
| **why** | Often these divergent modifications are due to poor program structure or "copypasta programmingâ€. |
| **treat** | Split up the behavior of the class via Extract Class . If different classes have the same behavior, you may want to combine the classes through inheritance ( Extract Superclass and Extract Subclass ). |
| **â†’ techs** | `extract-class` Â· `extract-subclass` Â· `extract-superclass` |

## Shotgun Surgery (`shotgun-surgery`)

| | |
| --- | --- |
| **signs** | Making any modifications requires that you make many small changes to many different classes. |
| **why** | A single responsibility has been split up among a large number of classes. This can happen after overzealous application of Divergent Change . |
| **treat** | Use Move Method and Move Field to move existing class behaviors into a single class. If thereâ€™s no class appropriate for this, create a new one. If moving code to the same class leaves the original classes almost empty, try to get rid of these now-redundant classes via Inline Class . |
| **â†’ techs** | `inline-class` Â· `move-field` Â· `move-method` |

## Parallel Inheritance Hierarchies (`parallel-inheritance-hierarchies`)

| | |
| --- | --- |
| **signs** | Whenever you create a subclass for a class, you find yourself needing to create a subclass for another class. |
| **why** | All was well as long as the hierarchy stayed small. But with new classes being added, making changes has become harder and harder. |
| **treat** | - You may de-duplicate parallel class hierarchies in two steps. First, make instances of one hierarchy refer to instances of another hierarchy. Then, remove the hierarchy in the referred class, by using Move Method and Move Field . |
| **â†’ techs** | `move-field` Â· `move-method` |

---

# Smells â€” Dispensables


> Dispensables â€” pointless code whose absence would clarify.

## Comments (`comments`)

| | |
| --- | --- |
| **signs** | A method is filled with explanatory comments. |
| **why** | Comments are usually created with the best of intentions, when the author realizes that his or her code isnâ€™t intuitive or obvious. In such cases, comments are like a deodorant masking the smell of fishy code that could be improved. The best comment is a good name for a method or class. If you feel that a codeâ€¦ |
| **treat** | If a comment is intended to explain a complex expression, the expression should be split into understandable subexpressions using Extract Variable . If a comment explains a section of code, this section can be turned into a separate method via Extract Method . The name of the new method can be taken from the comment text itself, most likely. If a method has already been extracted, but comments are still necessary to explain what the method does, give the method aâ€¦ |
| **â†’ techs** | `extract-method` Â· `extract-variable` Â· `introduce-assertion` Â· `rename-method` |

## Duplicate Code (`duplicate-code`)

| | |
| --- | --- |
| **signs** | Two code fragments look almost identical. |
| **why** | Duplication usually occurs when multiple programmers are working on different parts of the same program at the same time. Since theyâ€™re working on different tasks, they may be unaware their colleague has already written similar code that could be repurposed for their own needs. Thereâ€™s also more subtle duplication,â€¦ |
| **treat** | If the same code is found in two or more methods in the same class: use Extract Method and place calls for the new method in both places. If the same code is found in two subclasses of the same level: Use Extract Method for both classes, followed by Pull Up Field for the fields used in the method that youâ€™re pulling up. If the duplicate code is inside a constructor, use Pull Up Constructor Body . If the duplicate code is similar but not completely identical, use Formâ€¦ |
| **â†’ techs** | `consolidate-conditional-expression` Â· `consolidate-duplicate-conditional-fragments` Â· `extract-class` Â· `extract-method` Â· `extract-superclass` Â· `form-template-method` Â· `pull-up-constructor-body` Â· `pull-up-field` Â· `substitute-algorithm` |

## Lazy Class (`lazy-class`)

| | |
| --- | --- |
| **signs** | Understanding and maintaining classes always costs time and money. So if a class doesnâ€™t do enough to earn your attention, it should be deleted. |
| **why** | Perhaps a class was designed to be fully functional but after some of the refactoring it has become ridiculously small. Or perhaps it was designed to support future development work that never got done. |
| **treat** | Components that are near-useless should be given the Inline Class treatment. For subclasses with few functions, try Collapse Hierarchy . |
| **â†’ techs** | `collapse-hierarchy` Â· `inline-class` |

## Data Class (`data-class`)

| | |
| --- | --- |
| **signs** | A data class refers to a class that contains only fields and crude methods for accessing them (getters and setters). These are simply containers for data used by other classes. These classes donâ€™t contain any additional functionality and canâ€™t independently operate on the dataâ€¦ |
| **why** | Itâ€™s a normal thing when a newly created class contains only a few public fields (and maybe even a handful of getters/setters). But the true power of objects is that they can contain behavior types or operations on their data. |
| **treat** | If a class contains public fields, use Encapsulate Field to hide them from direct access and require that access be performed via getters and setters only. Use Encapsulate Collection for data stored in collections (such as arrays). Review the client code that uses the class. In it, you may find functionality that would be better located in the data class itself. If this is the case, use Move Method and Extract Method to migrate this functionality to the data class. Afterâ€¦ |
| **â†’ techs** | `encapsulate-collection` Â· `encapsulate-field` Â· `extract-method` Â· `hide-method` Â· `move-method` Â· `remove-setting-method` |

## Dead Code (`dead-code`)

| | |
| --- | --- |
| **signs** | A variable, parameter, field, method or class is no longer used (usually because itâ€™s obsolete). |
| **why** | When requirements for the software have changed or corrections have been made, nobody had time to clean up the old code. Such code could also be found in complex conditionals, when one of the branches becomes unreachable (due to error or other circumstances). |
| **treat** | The quickest way to find dead code is to use a good IDE . Delete unused code and unneeded files. In the case of an unnecessary class, Inline Class or Collapse Hierarchy can be applied if a subclass or superclass is used. To remove unneeded parameters, use Remove Parameter . |
| **â†’ techs** | `collapse-hierarchy` Â· `inline-class` Â· `remove-parameter` |

## Speculative Generality (`speculative-generality`)

| | |
| --- | --- |
| **signs** | Thereâ€™s an unused class, method, field or parameter. |
| **why** | Sometimes code is created â€œjust in caseâ€ to support anticipated future features that never get implemented. As a result, code becomes hard to understand and support. |
| **treat** | For removing unused abstract classes, try Collapse Hierarchy . Unnecessary delegation of functionality to another class can be eliminated via Inline Class . Unused methods? Use Inline Method to get rid of them. Methods with unused parameters should be given a look with the help of Remove Parameter . Unused fields can be simply deleted. |
| **â†’ techs** | `collapse-hierarchy` Â· `inline-class` Â· `inline-method` Â· `remove-parameter` |

---

# Smells â€” Couplers


> Couplers â€” excessive coupling or over-delegation between classes.

## Feature Envy (`feature-envy`)

| | |
| --- | --- |
| **signs** | A method accesses the data of another object more than its own data. |
| **why** | This smell may occur after fields are moved to a data class. If this is the case, you may want to move the operations on data to this class as well. |
| **treat** | As a basic rule, if things change at the same time, you should keep them in the same place. Usually data and functions that use this data are changed together (although exceptions are possible). If a method clearly should be moved to another place, use Move Method . If only part of a method accesses the data of another object, use Extract Method to move the part in question. If a method uses functions from several other classes, first determine which class contains most ofâ€¦ |
| **â†’ techs** | `extract-method` Â· `move-method` |

## Inappropriate Intimacy (`inappropriate-intimacy`)

| | |
| --- | --- |
| **signs** | One class uses the internal fields and methods of another class. |
| **why** | Keep a close eye on classes that spend too much time together. Good classes should know as little about each other as possible. Such classes are easier to maintain and reuse. |
| **treat** | The simplest solution is to use Move Method and Move Field to move parts of one class to the class in which those parts are used. But this works only if the first class truly doesnâ€™t need these parts. Another solution is to use Extract Class and Hide Delegate on the class to make the code relations â€œofficialâ€. If the classes are mutually interdependent, you should use Change Bidirectional Association to Unidirectional . If this â€œintimacyâ€ is between a subclass and theâ€¦ |
| **â†’ techs** | `change-bidirectional-association-to-unidirectional` Â· `extract-class` Â· `hide-delegate` Â· `move-field` Â· `move-method` Â· `replace-delegation-with-inheritance` |

## Message Chains (`message-chains`)

| | |
| --- | --- |
| **signs** | In code you see a series of calls resembling $a->b()->c()->d() |
| **why** | A message chain occurs when a client requests another object, that object requests yet another one, and so on. These chains mean that the client is dependent on navigation along the class structure. Any changes in these relationships require modifying the client. |
| **treat** | To delete a message chain, use Hide Delegate . Sometimes itâ€™s better to think of why the end object is being used. Perhaps it would make sense to use Extract Method for this functionality and move it to the beginning of the chain, by using Move Method . |
| **â†’ techs** | `extract-method` Â· `hide-delegate` Â· `move-method` |

## Middle Man (`middle-man`)

| | |
| --- | --- |
| **signs** | If a class performs only one action, delegating work to another class, why does it exist at all? |
| **why** | This smell can be the result of overzealous elimination of Message Chains . In other cases, it can be the result of the useful work of a class being gradually moved to other classes. The class remains as an empty shell that doesnâ€™t do anything other than delegate. |
| **treat** | - If most of a methodâ€™s classes delegate to another class, Remove Middle Man is in order. |
| **â†’ techs** | `remove-middle-man` |

## Incomplete Library Class (`incomplete-library-class`)

| | |
| --- | --- |
| **signs** | Sooner or later, libraries stop meeting user needs. The only solution to the problemâ€”changing the libraryâ€”is often impossible since the library is read-only. |
| **why** | The author of the library hasnâ€™t provided the features you need or has refused to implement them. |
| **treat** | To introduce a few methods to a library class, use Introduce Foreign Method . For big changes in a class library, use Introduce Local Extension . |
| **â†’ techs** | `introduce-foreign-method` Â· `introduce-local-extension` |


